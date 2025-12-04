"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Pause, Play, SkipBack, SkipForward, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RawTrack = {
  id?: string | number;
  title?: string;
  name?: string;
  artist?: string;
  performer?: string;
  streamUrl?: string;
  url?: string;
  href?: string;
  artwork?: string;
  cover?: string;
};

type Track = {
  id: string;
  title: string;
  artist?: string;
  streamUrl: string;
  artwork?: string;
};

type TrackInput = Omit<Track, "id"> & { id?: string };

const SAMPLE_PLAYLIST = `[
  {
    "title": "Sunset Drive",
    "artist": "SoundHelix",
    "streamUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    "title": "Rainy Morning",
    "artist": "SoundHelix",
    "streamUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    "title": "Moonlit Garden",
    "artist": "SoundHelix",
    "streamUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
]`;

const PLAIN_TEXT_URL_REGEX = /https?:\/\/\S+/g;

let trackIdCounter = 0;
const createTrackId = () => `track-${Date.now()}-${trackIdCounter++}`;
const assignRuntimeIds = (tracks: TrackInput[]): Track[] =>
  tracks.map((track) => ({
    ...track,
    id: track.id ?? createTrackId()
  }));

const extractTracks = (input: unknown): TrackInput[] => {
  const entries = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null && Array.isArray((input as { tracks?: RawTrack[] }).tracks)
    ? ((input as { tracks?: RawTrack[] }).tracks ?? [])
    : [];

  const normalized: TrackInput[] = [];

  entries.forEach((entry, index) => {
    if (!entry) {
      return;
    }

    if (typeof entry === "string") {
      normalized.push({
        id: String(index),
        title: `Track ${index + 1}`,
        streamUrl: entry
      });
      return;
    }

    if (typeof entry !== "object") {
      return;
    }

    const candidate = entry as RawTrack;
    const stream =
      typeof candidate.streamUrl === "string"
        ? candidate.streamUrl
        : typeof candidate.url === "string"
        ? candidate.url
        : typeof candidate.href === "string"
        ? candidate.href
        : undefined;

    if (!stream) {
      return;
    }

    const title =
      typeof candidate.title === "string"
        ? candidate.title
        : typeof candidate.name === "string"
        ? candidate.name
        : `Track ${index + 1}`;

    const artist =
      typeof candidate.artist === "string"
        ? candidate.artist
        : typeof candidate.performer === "string"
        ? candidate.performer
        : undefined;

    normalized.push({
      id: String(candidate.id ?? index),
      title,
      artist,
      artwork:
        typeof candidate.artwork === "string"
          ? candidate.artwork
          : typeof candidate.cover === "string"
          ? candidate.cover
          : undefined,
      streamUrl: stream
    });
  });

  return normalized;
};

const buildTracksFromUrls = (urls: string[]): TrackInput[] =>
  urls.map((url, index) => ({
    id: String(index),
    title: `Stream ${index + 1}`,
    streamUrl: url.trim()
  }));

const parsePlainTextPlaylist = (value: string): TrackInput[] => {
  const matches = value.match(PLAIN_TEXT_URL_REGEX);
  if (!matches?.length) {
    return [];
  }

  const sanitized = matches.map((match) => match.replace(/[\s)",]+$/g, ""));
  return buildTracksFromUrls(sanitized.filter(Boolean));
};

const parsePlaylistInput = (value: string): { tracks: TrackInput[]; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { tracks: [], error: "Paste playlist JSON or at least one direct stream URL." };
  }

  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed);
      const tracks = extractTracks(parsed);

      if (tracks.length) {
        return { tracks };
      }

      return { tracks: [], error: "Provide an array with at least one usable stream URL field." };
    } catch (err) {
      return {
        tracks: [],
        error: err instanceof Error ? err.message : "Unable to parse JSON playlist."
      };
    }
  }

  const plainTracks = parsePlainTextPlaylist(trimmed);
  if (plainTracks.length) {
    return { tracks: plainTracks };
  }

  return { tracks: [], error: "Provide a JSON playlist or direct URLs separated by spaces or new lines." };
};

export default function HomePage() {
  const [rawInput, setRawInput] = useState(SAMPLE_PLAYLIST);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [shouldForcePlay, setShouldForcePlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const currentTrack = playlist[currentIndex];

  useEffect(() => {
    if (!playlist.length && currentIndex !== 0) {
      setCurrentIndex(0);
      return;
    }

    if (currentIndex > playlist.length - 1 && playlist.length) {
      setCurrentIndex(playlist.length - 1);
    }
  }, [playlist.length, currentIndex]);

  useEffect(() => {
    if (!currentTrack && shouldForcePlay) {
      setShouldForcePlay(false);
    }
  }, [currentTrack, shouldForcePlay]);

  useEffect(() => {
    if (!shouldForcePlay || !currentTrack) {
      return;
    }

    const node = audioRef.current;
    if (!node) {
      return;
    }

    const attemptPlayback = async () => {
      try {
        if (node.readyState < 3) {
          setIsLoadingTrack(true);
        }
        await node.play();
        setHint(null);
      } catch {
        setHint("Press play once to allow background audio.");
        setIsLoadingTrack(false);
      } finally {
        setShouldForcePlay(false);
      }
    };

    attemptPlayback();
  }, [audioRef, shouldForcePlay, currentTrack]);

  useEffect(() => {
    setProgress(0);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!currentTrack) {
      setIsLoadingTrack(false);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!playlist.length) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setProgress(0);
    }
  }, [audioRef, playlist.length]);

  const handlePlaylistAction = useCallback(
    (mode: "replace" | "append") => {
      setHint(null);

      const { tracks, error: parseError } = parsePlaylistInput(rawInput);

      if (!tracks.length) {
        setError(parseError ?? "Provide playlist data with at least one stream URL.");
        if (mode === "replace") {
          audioRef.current?.pause();
          setPlaylist([]);
          setCurrentIndex(0);
          setIsPlaying(false);
          setProgress(0);
          setIsLoadingTrack(false);
          setShouldForcePlay(false);
        }
        return;
      }

      setError(null);
      const playlistWithIds = assignRuntimeIds(tracks);

      if (mode === "replace") {
        audioRef.current?.pause();
        setIsPlaying(false);
        setProgress(0);
        setIsLoadingTrack(false);
        setShouldForcePlay(false);
        setPlaylist(playlistWithIds);
        setCurrentIndex(0);
        return;
      }

      setPlaylist((prev) => [...prev, ...playlistWithIds]);
      if (!playlist.length) {
        audioRef.current?.pause();
        setIsPlaying(false);
        setIsLoadingTrack(false);
        setShouldForcePlay(false);
        setCurrentIndex(0);
        setProgress(0);
      }
    },
    [audioRef, rawInput, playlist.length]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handlePlaylistAction("replace");
  };

  const handleLinkInsert = useCallback(() => {
    setLinkError(null);

    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      setLinkError("Provide a direct stream URL.");
      return;
    }

    const trimmedTitle = linkTitle.trim();
    const newTrack: Track = {
      id: createTrackId(),
      title: trimmedTitle || "Manual stream",
      streamUrl: trimmedUrl
    };

    const hadTracks = playlist.length > 0;
    setPlaylist((prev) => [...prev, newTrack]);

    if (!hadTracks) {
      audioRef.current?.pause();
      setCurrentIndex(0);
      setIsPlaying(false);
      setIsLoadingTrack(false);
      setShouldForcePlay(false);
      setProgress(0);
    }

    setLinkTitle("");
    setLinkUrl("");
  }, [audioRef, linkTitle, linkUrl, playlist.length]);

  const handleLinkSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleLinkInsert();
  };

  const handleClearQueue = useCallback(() => {
    audioRef.current?.pause();
    setPlaylist([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setProgress(0);
    setHint(null);
    setIsLoadingTrack(false);
    setShouldForcePlay(false);
  }, [audioRef]);

  const handleDeleteTrack = useCallback(
    (trackId: string) => {
      const audioNode = audioRef.current;
      const wasPlaying = !!audioNode && !audioNode.paused;

      setPlaylist((prev) => {
        const removeIndex = prev.findIndex((track) => track.id === trackId);
        if (removeIndex === -1) {
          return prev;
        }

        const nextPlaylist = prev.filter((track) => track.id !== trackId);

        if (!nextPlaylist.length) {
          audioNode?.pause();
          setIsPlaying(false);
          setProgress(0);
          setHint(null);
          setShouldForcePlay(false);
          setIsLoadingTrack(false);
          setCurrentIndex(0);
          return nextPlaylist;
        }

        setCurrentIndex((current) => {
          if (removeIndex < current) {
            return Math.max(0, current - 1);
          }

          if (removeIndex === current) {
            const updatedIndex = Math.min(current, nextPlaylist.length - 1);
            if (wasPlaying) {
              setShouldForcePlay(true);
            }
            return updatedIndex;
          }

          return current;
        });

        return nextPlaylist;
      });
    },
    [audioRef]
  );

  const handleTimeUpdate = () => {
    const node = audioRef.current;
    if (!node || !node.duration) {
      setProgress(0);
      return;
    }

    setProgress((node.currentTime / node.duration) * 100);
  };

  const playNext = useCallback(
    (shouldResumePlayback = false) => {
      setCurrentIndex((index) => {
        if (index + 1 >= playlist.length) {
          setIsPlaying(false);
          return index;
        }

        if (shouldResumePlayback) {
          setShouldForcePlay(true);
        }

        return index + 1;
      });
    },
    [playlist.length]
  );

  const playPrevious = useCallback((shouldResumePlayback = false) => {
    setCurrentIndex((index) => {
      if (index === 0) {
        return index;
      }

      if (shouldResumePlayback) {
        setShouldForcePlay(true);
      }

      return index - 1;
    });
  }, []);

  const togglePlayback = () => {
    const node = audioRef.current;
    if (!node) {
      return;
    }

    if (node.paused) {
      if (node.readyState < 3) {
        setIsLoadingTrack(true);
      }
      node
        .play()
        .then(() => setHint(null))
        .catch(() => {
          setHint("Interaction required to resume playback.");
          setIsLoadingTrack(false);
        });
    } else {
      node.pause();
      setIsLoadingTrack(false);
    }
  };

  const playlistSummary = useMemo(() => {
    if (!playlist.length) {
      return "No tracks loaded";
    }
    return `${playlist.length} track${playlist.length > 1 ? "s" : ""} ready`;
  }, [playlist.length]);

  const exportableJson = useMemo(() => {
    if (!playlist.length) {
      return "";
    }

    const payload = playlist.map((track) => {
      const base: { title: string; streamUrl: string; artist?: string; artwork?: string } = {
        title: track.title,
        streamUrl: track.streamUrl
      };

      if (track.artist) {
        base.artist = track.artist;
      }
      if (track.artwork) {
        base.artwork = track.artwork;
      }

      return base;
    });

    return JSON.stringify(payload, null, 2);
  }, [playlist]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timer = window.setTimeout(() => setCopyState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopyPlaylist = useCallback(async () => {
    if (!playlist.length || !exportableJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exportableJson);
      setCopyState("copied");
      return;
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = exportableJson;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopyState("copied");
        return;
      } catch {
        setCopyState("error");
      }
    }
  }, [exportableJson, playlist.length]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-12">
      <div className="space-y-6">
        <div className="text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/80">Playlist Builder</p>
          <h1 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">Stream MP3 playlists from JSON</h1>
          <p className="mt-4 max-w-2xl text-base text-white/70">
            Paste any playlist definition and let the player decode, queue, and keep audio running in the background.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Drop in your JSON</CardTitle>
                <CardDescription>Paste JSON or raw URLs—we will pull out any playable stream automatically.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    spellCheck={false}
                    className="min-h-[260px]"
                    value={rawInput}
                    onChange={(event) => setRawInput(event.target.value)}
                  />
                  <div className="grid gap-3 min-[480px]:grid-cols-3">
                    <Button type="submit">
                      Build playlist
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePlaylistAction("append")}
                    >
                      Add to queue
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                    onClick={() => {
                      setRawInput(SAMPLE_PLAYLIST);
                      setPlaylist([]);
                      setCurrentIndex(0);
                      setIsPlaying(false);
                      setError(null);
                      setHint(null);
                      setLinkError(null);
                    }}
                  >
                    Reset sample
                  </Button>
                </div>
                </form>
                {error && <p className="text-sm text-rose-300">{error}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick link insert</CardTitle>
                <CardDescription>Add a single stream with an optional custom title.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLinkSubmit} className="space-y-4">
                  <div className="grid gap-3 min-[480px]:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70" htmlFor="link-title">
                        Title <span className="text-white/40">(optional)</span>
                      </label>
                      <Input
                        id="link-title"
                        placeholder="Lo-fi mix"
                        value={linkTitle}
                        onChange={(event) => setLinkTitle(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70" htmlFor="link-url">
                        Stream URL
                      </label>
                      <Input
                        id="link-url"
                        type="url"
                        required
                        placeholder="https://example.com/live.mp3"
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 min-[480px]:flex-row">
                    <Button type="submit">
                      Add to queue
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="border border-white/10 bg-transparent"
                      onClick={() => {
                        setLinkTitle("");
                        setLinkUrl("");
                        setLinkError(null);
                      }}
                    >
                      Clear fields
                    </Button>
                  </div>
                </form>
                {linkError && <p className="text-sm text-rose-300">{linkError}</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/20">
            <CardHeader>
              <CardDescription>{playlistSummary}</CardDescription>
              <CardTitle>{currentTrack ? currentTrack.title : "No track selected"}</CardTitle>
              <p className="text-sm text-white/70">
                {currentTrack ? currentTrack.artist ?? "Unknown artist" : "Load a playlist to begin"}
              </p>
            </CardHeader>
            <CardContent className="gap-5">
              <Progress value={progress} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const shouldResume = !!audioRef.current && !audioRef.current.paused;
                    playPrevious(shouldResume);
                  }}
                  disabled={!playlist.length || currentIndex === 0}
                  aria-label="Previous track"
                >
                  <SkipBack className="h-5 w-5" />
                  <span className="sr-only">Previous</span>
                </Button>
                <Button onClick={togglePlayback} disabled={!currentTrack} aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const shouldResume = !!audioRef.current && !audioRef.current.paused;
                    playNext(shouldResume);
                  }}
                  disabled={!playlist.length || currentIndex + 1 >= playlist.length}
                  aria-label="Next track"
                >
                  <SkipForward className="h-5 w-5" />
                  <span className="sr-only">Next</span>
                </Button>
              </div>
              {isLoadingTrack && currentTrack && (
                <p className="text-sm text-white/80">Loading "{currentTrack.title}"...</p>
              )}
              {hint && <p className="text-sm text-amber-200/90">{hint}</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Up next</CardTitle>
              <CardDescription>{playlistSummary}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {playlist.length > 0 && (
                <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs uppercase tracking-wide text-emerald-300">
                  Background ready
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="border border-white/10 px-3 py-1 text-xs font-semibold text-white/70 hover:text-white"
                onClick={handleClearQueue}
                disabled={!playlist.length}
              >
                Clear queue
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {playlist.length === 0 ? (
              <p className="text-sm text-white/70">No tracks loaded yet. Paste JSON or insert a link to get started.</p>
            ) : (
              <ol className="space-y-3">
                {playlist.map((track, index) => (
                  <li key={track.id}>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "flex-1 justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-base font-semibold",
                          index === currentIndex
                            ? "border-emerald-300/60 bg-emerald-400/10 text-white"
                            : "text-white/80 hover:border-white/30"
                      )}
                      onClick={() => {
                        const shouldResume = !!audioRef.current && !audioRef.current.paused;
                        setCurrentIndex(index);
                        if (shouldResume) {
                          setShouldForcePlay(true);
                        }
                      }}
                    >
                        <span className="flex flex-col text-left">
                          <span>{track.title}</span>
                          <span className="text-sm font-normal text-white/60">{track.artist ?? "Unknown artist"}</span>
                        </span>
                        <span className="text-sm text-white/70">
                          {index === currentIndex && playlist.length ? "Now" : index + 1}
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Remove ${track.title}`}
                        className="rounded-2xl border border-white/10 px-3 text-white/70 hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-white"
                        onClick={() => handleDeleteTrack(track.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Export current playlist</CardTitle>
              <CardDescription>Copy the generated JSON representation of your queue.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={handleCopyPlaylist} disabled={!playlist.length}>
              {copyState === "copied" ? "Copied!" : copyState === "error" ? "Unable to copy" : "Copy JSON"}
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              className="min-h-[200px] font-mono text-sm"
              value={exportableJson}
              placeholder="Build a playlist or add a link to export JSON."
            />
          </CardContent>
        </Card>
      </div>

      <audio
        ref={audioRef}
        className="hidden"
        src={currentTrack?.streamUrl ?? undefined}
        onEnded={() => playNext(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          setIsLoadingTrack(false);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadStart={() => setIsLoadingTrack(true)}
        onCanPlay={() => setIsLoadingTrack(false)}
        onPlaying={() => setIsLoadingTrack(false)}
        onWaiting={() => setIsLoadingTrack(true)}
        onStalled={() => setIsLoadingTrack(true)}
        onError={() => {
          setIsLoadingTrack(false);
          setHint("Unable to load this stream. Please try again.");
        }}
        preload="none"
      />
    </main>
  );
}

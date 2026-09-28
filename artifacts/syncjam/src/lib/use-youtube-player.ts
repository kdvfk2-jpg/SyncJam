import { useEffect, useRef, useState } from 'react';

type YouTubePlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: { onReady?: () => void };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('The YouTube player API did not initialize.'));
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('The YouTube player API could not load.'));
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

export function useYouTubePlayer(videoId: string | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let disposed = false;
    playerRef.current?.destroy();
    playerRef.current = null;

    if (!videoId || !containerRef.current) {
      setStatus('idle');
      setDuration(0);
      setCurrentTime(0);
      return () => {
        disposed = true;
      };
    }

    setStatus('loading');
    const timeInterval = window.setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 500);
    loadYouTubeApi()
      .then((api) => {
        if (disposed || !containerRef.current) return;
        playerRef.current = new api.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (!disposed) {
                setDuration(playerRef.current?.getDuration() ?? 0);
                setCurrentTime(playerRef.current?.getCurrentTime() ?? 0);
                setStatus('ready');
              }
            },
          },
        });
      })
      .catch(() => {
        if (!disposed) setStatus('error');
      });

    return () => {
      disposed = true;
      window.clearInterval(timeInterval);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return {
    containerRef,
    status,
    duration,
    currentTime,
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
  };
}
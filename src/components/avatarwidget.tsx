"use client";
import { useState, useRef, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";
import StreamingAvatar, {
  StreamingEvents,
  VoiceEmotion,
  AvatarQuality,
  StartAvatarResponse,
  TaskType,
  TaskMode,
} from "@heygen/streaming-avatar";

export default function AvatarWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [data, setData] = useState<StartAvatarResponse>();
  const [stream, setStream] = useState<MediaStream>();

  const mediaStream = useRef<HTMLVideoElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsExpanded(false);
    }
  };

  const openWindow = () => {
    setIsExpanded(true);
    startSession();
  };

  const closeWindow = () => {
    setIsExpanded(false);
    avatar?.current?.closeVoiceChat();
    endSession();
  };

  async function fetchAccessToken() {
    const apiKey = import.meta.env.VITE_APP_HEYGEN_API_KEY;
    try {
      const response = await fetch(
        "https://api.heygen.com/v1/streaming.create_token",
        {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      const payload = await response.json();

      console.log("Access Token:", payload.data.token); // Log the token to verify

      return payload.data.token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log("stream started");
      setIsLoadingSession(false);
      setStream(event.detail);
      setTimeout(function () {
        handleSpeak();
      }, 1000);

      avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
        endSession();
      });
      avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail);
        setStream(event.detail);
      });
      avatar.current?.on(StreamingEvents.USER_START, (event) => {
        console.log(">>>>> User started talking:", event);
      });
      avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
        console.log(">>>>> User stopped talking:", event);
      });
      avatar.current?.on(StreamingEvents.USER_TALKING_MESSAGE, (message) => {
        console.log("User talking message:", message);
        // Handle the user's message input to the avatar
      });
    });

    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "Anna_public_3_20240108",
        voice: {
          rate: 1.5, // 0.5 ~ 1.5
          emotion: VoiceEmotion.EXCITED,
        },
        language: "en",
      });

      setData(res);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSpeak() {
    if (!avatar.current) {
      console.log("Avatar not initialized");

      return;
    }
    // await avatar.current
    //   .speak({
    //     text: "hello I am an assistant",
    //     taskType: TaskType.REPEAT,
    //     taskMode: TaskMode.SYNC,
    //   })
    //   .catch((e) => {
    //     console.log(e.message);
    //   });

    await avatar.current?.startVoiceChat();
  }

  async function endSession() {
    await avatar.current?.stopAvatar();
    console.log("stopped stream");
    setStream(undefined);
  }

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        console.log("Playing");
      };
    }
  }, [mediaStream, stream]);

  return (
    <div className="fixed bottom-4 left-4" ref={windowRef}>
      {isExpanded ? (
        <div
          className="bg-white rounded-lg shadow-lg p-4 w-80 h-96 flex flex-col items-center"
          role="dialog"
          aria-label="Chat window"
          onKeyDown={handleKeyDown}
        >
          <div className="w-full h-full flex items-center justify-center">
            {isLoadingSession ? (
              <span className="loader"></span>
            ) : (
              <video className="rounded-lg" ref={mediaStream}></video>
            )}
          </div>
          <button
            className="p-2 rounded-full transition-colors duration-200 bg-red-600 hover:bg-red-700 w-40 text-white"
            onClick={closeWindow}
            aria-label="Close chat window"
          >
            End Call
          </button>
        </div>
      ) : (
        <button
          onClick={openWindow}
          className="bg-[#36fa87] text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-200 shadow-lg"
          aria-label="Open chat window"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

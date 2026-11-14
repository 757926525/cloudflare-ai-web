"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useVoiceChat() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "zh-CN";

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          toast.error(`Voice recognition error: ${event.error}`);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startListening = (onFinalTranscript?: (text: string) => void) => {
    if (!recognitionRef.current) {
      toast.warning("Speech recognition is not supported in this browser. Please use Chrome/Edge.");
      return;
    }

    setTranscript("");
    if (onFinalTranscript) {
      recognitionRef.current.onresult = (event: any) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          onFinalTranscript(final);
        } else if (interim) {
          setTranscript(interim);
        }
      };
    }

    try {
      recognitionRef.current.start();
    } catch {
      // recognition already running
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.warning("Voice synthesis not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown chars for smoother speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "代码片段已省略")
      .replace(/[#*`_~[\]]/g, "")
      .slice(0, 1000); // limit speech chunk

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "zh-CN";
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}

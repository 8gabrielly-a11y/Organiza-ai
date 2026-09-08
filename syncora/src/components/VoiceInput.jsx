import React, { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceInput({ onResult, listening, setListening, disabled }) {
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, []);

  const toggle = () => {
    if (!recRef.current || disabled) return;
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      try {
        recRef.current.start();
        setListening(true);
      } catch (e) {
        setListening(false);
      }
    }
  };

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      className={`rounded-full p-3 transition shrink-0 ${
        listening ? 'bg-red-500 text-white animate-pulse' : 'bg-muted text-foreground hover:bg-muted/70'
      }`}
      title={listening ? 'Parar' : 'Falar'}
    >
      {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}
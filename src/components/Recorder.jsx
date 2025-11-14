import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function Recorder({ onUploaded }) {
  const [mode, setMode] = useState("mic"); // 'mic' | 'screen'
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [blob, setBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    return () => {
      stopTimer();
      stopStream(mediaStream);
    };
  }, [mediaStream]);

  const startTimer = () => {
    stopTimer();
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const stopStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
  };

  const startRecording = async () => {
    setError("");
    setBlob(null);
    setChunks([]);

    try {
      let stream;
      if (mode === "mic") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }
      setMediaStream(stream);

      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) setChunks((prev) => [...prev, e.data]);
      };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current || chunks, { type: "video/webm" });
        setBlob(b);
        stopStream(stream);
        setMediaStream(null);
        setRecording(false);
        stopTimer();
      };

      // ensure chunksRef for finalization
      const chunksRef = { current: [] };
      setChunks([]);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          setChunks((prev) => [...prev, e.data]);
        }
      };

      recorder.start(1000);
      setRecording(true);
      setSeconds(0);
      startTimer();
    } catch (err) {
      console.error(err);
      setError(err.message || "Recording failed. Check permissions.");
      stopStream(mediaStream);
      setMediaStream(null);
      setRecording(false);
      stopTimer();
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current && recorderRef.current.state !== "inactive" && recorderRef.current.stop();
    } catch (e) {
      console.error(e);
    }
  };

  const uploadRecording = async () => {
    if (!blob) return;
    setUploading(true);
    try {
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/meetings/upload`, { method: "POST", body: form });
      const data = await res.json();
      setUploading(false);
      setBlob(null);
      setChunks([]);
      if (onUploaded) onUploaded(data);
      alert("Recording uploaded and queued for transcription.");
    } catch (e) {
      console.error(e);
      setUploading(false);
      setError("Upload failed.");
    }
  };

  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Record a meeting</h2>
        <span className="text-xs text-gray-500">{recording ? `Recording ${mmss(seconds)}` : "Idle"}</span>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="mode" value="mic" checked={mode === "mic"} onChange={() => setMode("mic")} />
          Microphone only
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="mode" value="screen" checked={mode === "screen"} onChange={() => setMode("screen")} />
          Screen + Tab Audio
        </label>
      </div>

      <div className="flex items-center gap-3">
        {!recording ? (
          <button onClick={startRecording} className="px-4 py-2 rounded bg-emerald-600 text-white">Start</button>
        ) : (
          <button onClick={stopRecording} className="px-4 py-2 rounded bg-rose-600 text-white">Stop</button>
        )}
        <button onClick={uploadRecording} disabled={!blob || uploading} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">
          {uploading ? "Uploading..." : "Upload Recording"}
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Tip: For platform audio (Zoom/Meet), choose Screen + Tab Audio and select the tab with "Share tab audio" enabled. Availability varies by browser.
      </p>
    </div>
  );
}

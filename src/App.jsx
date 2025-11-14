import { useEffect, useState } from "react";
import Recorder from "./components/Recorder.jsx";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

function App() {
  const [meetings, setMeetings] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/meetings`);
      const data = await res.json();
      setMeetings(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/meetings/upload`, {
        method: "POST",
        body: form,
      });
      await res.json();
      setUploading(false);
      setFile(null);
      await fetchMeetings();
      alert("Upload queued. It may take a minute to process.");
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const loadMeeting = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_BASE}/api/meetings/${id}`);
      const data = await res.json();
      setSelected(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 text-gray-800">
      <header className="px-6 py-5 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Universal Meeting Recorder</h1>
          <form onSubmit={onUpload} className="flex items-center gap-3">
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block text-sm"
            />
            <button
              disabled={!file || uploading}
              className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Recorder onUploaded={fetchMeetings} />

        <main className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Your meetings</h2>
            <ul className="divide-y">
              {meetings.map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{m.title || m.id}</p>
                    <p className="text-xs text-gray-500">Status: {m.status}</p>
                  </div>
                  <button
                    onClick={() => loadMeeting(m.id)}
                    className="text-indigo-600 hover:underline"
                  >
                    View
                  </button>
                </li>
              ))}
              {meetings.length === 0 && (
                <li className="py-6 text-sm text-gray-500">No meetings yet. Upload or record from Zoom, Meet, Teams, etc.</li>
              )}
            </ul>
          </section>

          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Details</h2>
            {!selected && <p className="text-sm text-gray-500">Select a meeting to view transcript and notes.</p>}
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selected.title || selected.id}</p>
                    <p className="text-xs text-gray-500">Status: {selected.status}</p>
                  </div>
                  <button onClick={() => loadMeeting(selected.id)} className="text-xs text-indigo-600">Refresh</button>
                </div>

                {loadingDetail && <p className="text-sm">Loading...</p>}

                {selected.summary && (
                  <div>
                    <h3 className="font-semibold mb-1">AI Notes</h3>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.summary.replace(/\n/g, "<br/>") }} />
                  </div>
                )}

                {selected.speakers && (
                  <div>
                    <h3 className="font-semibold mb-1">Transcript</h3>
                    <div className="space-y-2 max-h-80 overflow-auto pr-2">
                      {selected.speakers.map((seg, idx) => (
                        <p key={idx} className="text-sm"><span className="font-semibold mr-2">{seg.speaker || `Speaker ${idx+1}`}:</span>{seg.text}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>

        <footer className="text-center text-xs text-gray-500 py-6">
          Upload or record from any platform. Transcription, speaker diarization, language detection, and clean AI notes included.
        </footer>
      </div>
    </div>
  );
}

export default App;

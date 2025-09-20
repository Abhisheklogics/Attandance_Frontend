import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import toast, { Toaster } from "react-hot-toast";
import { openDB } from "idb";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [student, setStudent] = useState({ name: "", roll: "", class: "", parentNumber: "" });
  const [loading, setLoading] = useState(false);
  const [embeddingsArray, setEmbeddingsArray] = useState([]);

  // --- Initialize IndexedDB ---
  async function initDB() {
    return openDB("StudentDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("students")) {
          db.createObjectStore("students", { keyPath: "roll" }); // Roll number as unique key
        }
      },
    });
  }

  // --- Load face-api models ---
  useEffect(() => {
    const loadModels = async () => {
      try {
        toast.loading("Loading face detection models...");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        toast.dismiss();
        toast.success("Models loaded!");
        startVideo();
      } catch (err) {
        toast.error("Failed to load models.");
        console.error(err);
      }
    };
    loadModels();
  }, []);

  // --- Start webcam ---
  function startVideo() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        toast.error("Camera error");
        console.error(err);
      });
  }

  // --- Draw detections ---
  useEffect(() => {
    const draw = async () => {
      if (videoRef.current && canvasRef.current) {
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks();
        faceapi.matchDimensions(canvasRef.current, {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
        const resized = faceapi.resizeResults(detections, {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resized);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
      }
      requestAnimationFrame(draw);
    };
    draw();
  }, []);

  // --- Capture and save photo ---
  const capturePhoto = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("Face not detected. Try again with better lighting.");
        return;
      }

      const embedding = Array.from(detection.descriptor);

      // Prevent similar captures
      if (embeddingsArray.some((e) => faceapi.euclideanDistance(e, embedding) < 0.35)) {
        toast("Please move slightly for a different angle.", { icon: "↔️" });
        return;
      }

      const updatedEmbeddings = [...embeddingsArray, embedding];
      setEmbeddingsArray(updatedEmbeddings);
      toast.success(`Photo captured! (${updatedEmbeddings.length}/2)`);

      
      if (updatedEmbeddings.length === 2) {
        const db = await initDB();
        await db.put("students", { ...student, embeddings: updatedEmbeddings });
        toast.success("Student saved to IndexedDB!");
        setEmbeddingsArray([]);
        setStudent({ name: "", roll: "", class: "", parentNumber: "" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error capturing photo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="myapp">
      <Toaster position="top-right" />
      <h1>Student Face Registration</h1>
      <div className="appvide">
        <video
          ref={videoRef}
          autoPlay
          muted
          crossOrigin="anonymous"
          className="appvide"
          width={640}
          height={480}
        />
        <canvas
          ref={canvasRef}
          className="appcanvas"
          width={640}
          height={480}
        />
      </div>

      <form className="student-form" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          placeholder="Name"
          value={student.name}
          onChange={(e) => setStudent({ ...student, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Roll Number"
          value={student.roll}
          onChange={(e) => setStudent({ ...student, roll: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Class"
          value={student.class}
          onChange={(e) => setStudent({ ...student, class: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Parent Number"
          value={student.parentNumber}
          onChange={(e) => setStudent({ ...student, parentNumber: e.target.value })}
          required
        />
        <button type="button" onClick={capturePhoto} disabled={loading}>
          {loading
            ? "Capturing..."
            : `Capture Photo (${embeddingsArray.length}/2)`}
        </button>
      </form>
    </div>
  );
}

export default App;

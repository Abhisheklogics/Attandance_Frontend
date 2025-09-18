import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [student, setStudent] = useState({ name: "", roll: "", class: "" });
  const [loading, setLoading] = useState(false);
  const [embeddingsArray, setEmbeddingsArray] = useState([]);

 
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

 
  function startVideo(){
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        toast.error("Camera error");
        console.error(err);
      });
  };


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

     
      if (
        embeddingsArray.some(
          (e) => faceapi.euclideanDistance(e, embedding) < 0.35
        )
      ) {
        toast("Please move slightly for a different angle.", { icon: "↔️" });
        return;
      }

      const updatedEmbeddings = [...embeddingsArray, embedding];
      setEmbeddingsArray(updatedEmbeddings);
      toast.success(`Photo captured! (${updatedEmbeddings.length}/3)`);

    if (embeddingsArray.length + 1 === 3) {
        
        const payload = { ...student, embeddings: [...embeddingsArray, embedding] };
        const res = await fetch("/api/register-student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        alert(data.message || " Student registered successfully!");
        setEmbeddingsArray([]);
          setStudent('');
        
      }
    } catch (err) {
      console.error(err);
      toast.error(" Error capturing photo.");
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
        <button type="button" onClick={capturePhoto} disabled={loading}>
          {loading
            ? "Capturing..."
            : `Capture Photo (${embeddingsArray.length}/3)`}
        </button>
      </form>
    </div>
  );
}

export default App;

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

function Attendance() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [students, setStudents] = useState([]);
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [currentStudent, setCurrentStudent] = useState(null);

  useEffect(() => {
    const loadModelsAndData = async () => {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      startVideo();

      const res = await fetch("/api/students");
      const data = await res.json();
      setStudents(data);

      const labeledDescriptors = data.map((stu) => {
        const descriptors = stu.embeddings.map((emb) => new Float32Array(emb));
        return new faceapi.LabeledFaceDescriptors(stu.name, descriptors);
      });

      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      setFaceMatcher(matcher);
    };

    loadModelsAndData();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => (videoRef.current.srcObject = stream))
      .catch((err) => console.error("Camera error:", err));
  };

  const handleVideoPlay = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const interval = setInterval(async () => {
      if (!faceMatcher) return;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (resizedDetections.length > 0) {
        const detection = resizedDetections[0]; 
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        const studentObj = students.find((s) => s.name === bestMatch.label);

        const displayText = studentObj
          ? `${bestMatch.label} - Class: ${studentObj.class}`
          : "Unknown";

        const box = detection.detection.box;
        ctx.strokeStyle = studentObj ? "#22c55e" : "#ef4444";
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        ctx.fillStyle = studentObj ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)";
        const textWidth = ctx.measureText(displayText).width;
        ctx.fillRect(box.x, box.y - 24, textWidth + 10, 24);

        ctx.fillStyle = "#fff";
        ctx.font = "18px Arial";
        ctx.fillText(displayText, box.x + 5, box.y - 5);

       
        setCurrentStudent(studentObj || null);
      } else {
        setCurrentStudent(null);
      }
    }, 200);

    return () => clearInterval(interval);
  };

  const markAttendance = async () => {
    if (!currentStudent) return;

    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentStudent.name,
          roll: currentStudent.roll,
          className: currentStudent.class,
        }),
      });
      const data = await res.json();
      alert(data.message || "Attendance marked!");
    } catch (err) {
      console.error(err);
      alert("Failed to mark attendance.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
      <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
        Real-Time Attendance
      </h1>

      <div className="relative w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border-4 border-white">
        <video
          ref={videoRef}
          autoPlay
          muted
          crossOrigin="anonymous"
          className="w-full h-auto"
          onPlay={handleVideoPlay}
        />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>

      <button
        onClick={markAttendance}
        disabled={!currentStudent}
        className={`mt-6 px-6 py-3 font-bold rounded-lg shadow-lg text-white ${
          currentStudent ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        {currentStudent ? `Mark Attendance for ${currentStudent.name}` : "No student detected"}
      </button>
    </div>
  );
}

export default Attendance;

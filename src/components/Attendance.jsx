import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { openDB } from "idb";

function Attendance() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [students, setStudents] = useState([]);
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [detectedStudents, setDetectedStudents] = useState([]);
  const [attendanceLog, setAttendanceLog] = useState({}); // Roll -> marked

  // 📂 Initialize Attendance DB
  async function initAttendanceDB() {
  return await openDB("AttendanceDB", 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("attendance")) {
      const store = db.createObjectStore("attendance", {
        keyPath: "id",
        autoIncrement: true, // ✅ ensures multiple entries
      });
      store.createIndex("roll", "roll", { unique: false });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  },
});

}

  // 📂 Load face-api models and student embeddings from StudentDB
  useEffect(() => {
    const loadModelsAndData = async () => {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      startVideo();

      const db = await openDB("StudentDB", 1);
      const allStudents = await db.getAll("students");
      setStudents(allStudents);

      const labeledDescriptors = allStudents.map((stu) => {
        const descriptors = stu.embeddings.map((emb) => new Float32Array(emb));
        return new faceapi.LabeledFaceDescriptors(stu.roll, descriptors);
      });
      setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
    };

    loadModelsAndData();
  }, []);

  // 🎥 Start webcam
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => (videoRef.current.srcObject = stream))
      .catch((err) => console.error("Camera error:", err));
  };

  // 📸 Detect faces continuously
  const handleVideoPlay = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const interval = setInterval(async () => {
      if (!faceMatcher) return;

      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const detectedList = [];

      resized.forEach((detection) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        const studentObj = students.find((s) => s.roll === bestMatch.label);
        const label = studentObj
          ? `${studentObj.name} (Roll: ${studentObj.roll})`
          : "Unknown";

        const box = detection.detection.box;
        ctx.strokeStyle = studentObj ? "#22c55e" : "#ef4444";
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        ctx.fillStyle = studentObj ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)";
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(box.x, box.y - 24, textWidth + 10, 24);

        ctx.fillStyle = "#fff";
        ctx.font = "18px Arial";
        ctx.fillText(label, box.x + 5, box.y - 5);

        if (studentObj) detectedList.push(studentObj);
      });

      setDetectedStudents(detectedList);
    }, 300);

    return () => clearInterval(interval);
  };

  // 📝 Mark attendance and store in IndexedDB
  const markAttendance = async (stu) => {
    if (!stu) return;

    const db = await initAttendanceDB();
    const today = new Date().toDateString();

    // Check if already marked today
    const allRecords = await db.getAll("attendance");
    const alreadyMarked = allRecords.some(
      (rec) => rec.roll === stu.roll && new Date(rec.timestamp).toDateString() === today
    );

    if (!alreadyMarked) {
     await db.add("attendance", {
  roll: stu.roll,
  name: stu.name,
  class: stu.class,
  present: true,
  timestamp: new Date().toISOString(),
});

      console.log(`Attendance stored for ${stu.name}`);
    }

    setAttendanceLog((prev) => ({ ...prev, [stu.roll]: true }));
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

      <div className="mt-6 w-full max-w-2xl bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-2">Detected Students</h2>
        {detectedStudents.length > 0 ? (
          detectedStudents.map((stu) => (
            <div
              key={stu.roll}
              className="flex items-center justify-between border-b py-2"
            >
              <span>
                {stu.name} (Roll: {stu.roll}, Class: {stu.class})
              </span>
              <button
                onClick={() => markAttendance(stu)}
                disabled={attendanceLog[stu.roll]}
                className={`px-3 py-1 text-white rounded ${
                  attendanceLog[stu.roll]
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {attendanceLog[stu.roll] ? "Marked" : "Mark Attendance"}
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No faces detected</p>
        )}
      </div>
    </div>
  );
}

export default Attendance;

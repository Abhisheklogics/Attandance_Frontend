import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export default function MultiFaceDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [embeddings, setEmbeddings] = useState([]);

  useEffect(() => {
    const loadModels = async () => {
      try {
       
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        console.log('✅ Models loaded');
        startVideo();
      } catch (err) {
        console.error('❌ Error loading models:', err);
      }
    };

    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: {} })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            videoRef.current.onloadedmetadata = () => {
              detectFaces();
            };
          }
        })
        .catch((err) => console.error('Camera error:', err));
    };

    const detectFaces = () => {
      const interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        if (videoRef.current.readyState !== 4) return;

        
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,      
          scoreThreshold: 0.3, 
        });

       
        const detections = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceDescriptors();

       
        console.log('detections:', detections);

        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

       
        const descriptors = resizedDetections.map((d) => d.descriptor);
        setEmbeddings(descriptors);
      }, 200);

      return () => clearInterval(interval);
    };

    loadModels();
  }, []);

  return (
    <div className="flex flex-col items-center p-6 bg-gray-900 text-white min-h-screen relative">
      <h1 className="text-2xl font-bold mb-4">Multi-Face Detection with Embeddings</h1>
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width="720"
          height="560"
          className="rounded-lg shadow-lg"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{ pointerEvents: 'none' }}
        />
      </div>

      <div className="mt-4 w-full max-w-3xl text-left">
        <h2 className="text-lg font-semibold mb-2">Detected Embeddings:</h2>
        <pre className="bg-gray-800 p-4 rounded overflow-x-auto text-xs">
          {JSON.stringify(embeddings, null, 2)}
        </pre>
      </div>
    </div>
  );
}

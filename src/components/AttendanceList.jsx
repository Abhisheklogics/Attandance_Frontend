import { useEffect, useState } from "react";
import { openDB } from "idb";
import { utils, writeFile } from "xlsx"; // ✅ Import xlsx

function AttendanceList() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch attendance from IndexedDB
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const db = await openDB("AttendanceDB", 2);
        const records = await db.getAll("attendance");
        const sorted = records.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setAttendanceData(sorted);
      } catch (err) {
        console.error("❌ Error fetching attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  const formatTime = (ts) => {
    if (!ts) return "N/A";
    const date = new Date(ts);
    return date.toLocaleString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 📊 Export to Excel
  const exportToExcel = () => {
    if (attendanceData.length === 0) return;

    const dataForExcel = attendanceData.map((rec) => ({
      Name: rec.name,
      Class: rec.class,
      Roll: rec.roll,
      Status: "Present",
      Time: formatTime(rec.timestamp),
    }));

    const ws = utils.json_to_sheet(dataForExcel);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Attendance");
    writeFile(wb, "Attendance_Report.xlsx");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl font-semibold text-gray-700">Loading attendance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Attendance Records</h1>

      {/* ✅ Export Button */}
      <button
        onClick={exportToExcel}
        className="mb-6 px-4 py-2 bg-green-500 text-white font-semibold rounded hover:bg-green-600"
      >
        Export to Excel
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-indigo-500 text-white">
            <tr>
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Class</th>
              <th className="py-3 px-6 text-left">Roll Number</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-left">Time Marked</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No attendance records found.
                </td>
              </tr>
            )}
            {attendanceData.map((record, index) => (
              <tr
                key={index}
                className={`border-b ${
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                } hover:bg-indigo-50 transition-colors`}
              >
                <td className="py-3 px-6">{record.name}</td>
                <td className="py-3 px-6">{record.class}</td>
                <td className="py-3 px-6">{record.roll}</td>
                <td className="py-3 px-6 text-green-600 font-semibold">Present</td>
                <td className="py-3 px-6">{formatTime(record.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AttendanceList;

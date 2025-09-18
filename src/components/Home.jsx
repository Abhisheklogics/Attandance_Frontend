export default function Home() {
  const handleClick = (section) => {
    alert(`Opening: ${section}`); 
  };

  const cards = [
    {
      id: "register",
      title: "Student Registration",
      desc: "Register students securely with face data.",
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: "attendance",
      title: "Real-Time Attendance",
      desc: "Mark attendance instantly using face recognition.",
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "show",
      title: "Show All Attendance",
      desc: "View and manage all attendance records.",
      color: "from-green-500 to-emerald-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col items-center justify-center px-6 py-10">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
        Face Recognition Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleClick(card.title)}
            className={`relative bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 cursor-pointer transition transform hover:-translate-y-2 hover:shadow-xl hover:shadow-${card.color.split(" ")[0]}/40`}
          >
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.color} opacity-10 transition-opacity duration-300 hover:opacity-20`}
            ></div>
            <h2 className="text-2xl font-bold mb-3">{card.title}</h2>
            <p className="text-gray-300">{card.desc}</p>
            <div className="mt-6 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition">
              Click to Open →
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-16 text-gray-500 text-sm">
        © {new Date().getFullYear()} Face Recognition System
      </footer>
    </div>
  );
}

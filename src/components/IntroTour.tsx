import { useState } from "react";
import { Plus, Check, Calendar } from "lucide-react";

type Slide = {
  icon: JSX.Element;
  title: string;
  desc: string;
  demo: JSX.Element;
};

const slides: Slide[] = [
  {
    icon: <Plus className="w-6 h-6" strokeWidth={3} />,
    title: "Create a task",
    desc: "Tap the + button to add a new reminder.",
    demo: (
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute w-32 h-12 rounded-2xl bg-white/90 shadow-md flex items-center px-3 gap-2 animate-[fade-in_0.6s_ease-out_both]">
          <span className="text-xl">🌸</span>
          <span className="text-xs font-bold text-stone-700">Drink water</span>
        </div>
        <div
          className="absolute -bottom-2 right-2 w-12 h-12 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg"
          style={{ animation: "pulse 1.4s ease-in-out infinite" }}
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </div>
      </div>
    ),
  },
  {
    icon: <Check className="w-6 h-6" strokeWidth={3} />,
    title: "Complete a task",
    desc: "Tap the circle to mark it done.",
    demo: (
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="w-36 h-14 rounded-2xl bg-white/90 shadow-md flex items-center px-3 gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg"
            style={{ animation: "scale-in 0.6s ease-out infinite alternate" }}
          >
            <Check className="w-5 h-5 text-amber-600" strokeWidth={3} />
          </div>
          <span className="text-xs font-bold text-stone-500 line-through">
            Stretch 5 min
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: <Calendar className="w-6 h-6" strokeWidth={3} />,
    title: "Check your calendar",
    desc: "Open the Calendar tab to see your plan.",
    demo: (
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="grid grid-cols-5 gap-1.5 p-3 rounded-2xl bg-white/90 shadow-md animate-[fade-in_0.6s_ease-out_both]">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-md ${
                i === 7 ? "bg-amber-400" : i % 3 === 0 ? "bg-amber-100" : "bg-stone-100"
              }`}
              style={{
                animation: `fade-in 0.4s ease-out ${i * 40}ms both`,
              }}
            />
          ))}
        </div>
      </div>
    ),
  },
];

export default function IntroTour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const s = slides[i];

  const next = () => {
    if (last) onDone();
    else setI(i + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-b from-rose-50 via-amber-50 to-white px-6 py-12 animate-[fade-in_0.4s_ease-out_both]">
      <button
        onClick={onDone}
        className="absolute top-5 right-5 text-xs font-bold text-stone-500 hover:text-stone-800"
      >
        Skip
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm">
        <div
          key={i}
          className="w-16 h-16 rounded-2xl bg-amber-400 text-white flex items-center justify-center mb-6 shadow-lg animate-[scale-in_0.4s_ease-out_both]"
        >
          {s.icon}
        </div>
        <div key={`d${i}`} className="mb-8 animate-[fade-in_0.5s_ease-out_both]">
          {s.demo}
        </div>
        <h2
          key={`t${i}`}
          className="text-2xl font-extrabold text-stone-800 mb-2 animate-[fade-in_0.4s_ease-out_both]"
        >
          {s.title}
        </h2>
        <p
          key={`p${i}`}
          className="text-stone-600 text-sm leading-relaxed animate-[fade-in_0.5s_ease-out_both]"
        >
          {s.desc}
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-amber-500" : "w-1.5 bg-stone-300"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-2xl shadow-sm transition"
        >
          {last ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );
}

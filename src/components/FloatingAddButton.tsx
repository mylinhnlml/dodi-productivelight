import { Plus } from "lucide-react";

interface FloatingAddButtonProps {
  onClick: () => void;
  hidden?: boolean;
  style?: React.CSSProperties;
}

/**
 * Reusable floating action button that navigates to the "Add" screen.
 * Persists across all screens of the app.
 */
const FloatingAddButton = ({ onClick, hidden, style }: FloatingAddButtonProps) => {
  if (hidden) return null;
  return (
    <button
      type="button"
      aria-label="Add reminder"
      onClick={onClick}
      className="absolute bottom-24 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-110 active:scale-95 animate-fade-in"
      style={{ background: "hsl(var(--primary))", ...style }}
    >
      <Plus className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
    </button>
  );
};

export default FloatingAddButton;

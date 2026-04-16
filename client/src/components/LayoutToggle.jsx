import { useTheme } from '../context/ThemeContext';

function IconLayout() {
  return (
    <svg className="theme-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M9 4v16M9 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function LayoutToggle({ className = '', compact = false }) {
  const { layout, toggleLayout } = useTheme();
  const isDoodle = layout === 'doodle';

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? ' theme-toggle--compact' : ''}${className ? ` ${className}` : ''}`}
      onClick={toggleLayout}
      aria-label={isDoodle ? 'Switch to classic layout' : 'Switch to doodle layout'}
      title={isDoodle ? 'Classic layout' : 'Doodle layout'}
    >
      <IconLayout />
      <span className="theme-toggle-text">{isDoodle ? 'Classic' : 'Doodle'}</span>
    </button>
  );
}

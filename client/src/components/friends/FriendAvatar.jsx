import { useState } from 'react';
import { assetUrl, hueFor, initials } from '../../utils/friends';

/** A person's uploaded photo, or their initials on a colour that's stable per tag. */
export default function FriendAvatar({ person, size = 38, className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = assetUrl(person?.avatar?.photoUrl);
  return (
    <span
      className={`fr-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), '--fr-hue': hueFor(person?.tag) }}
      aria-hidden="true"
    >
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials(person)}
    </span>
  );
}

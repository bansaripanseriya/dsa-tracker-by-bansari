import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const PROFILE_SECTION_LINKS = [
  { id: 'basic-details', label: 'My Basic Details' },
  { id: 'account-connect', label: 'Account Connect' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'resume', label: 'Add Your Resume' },
  { id: 'skills', label: 'Skills' }
];

const AVATAR_IMAGES = Object.entries(
  import.meta.glob('../assets/avatars/*.{png,jpg,jpeg,webp,svg}', { eager: true, import: 'default' })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src);

function SectionCard({ id, title, subtitle, children }) {
  return (
    <section id={id} className="profile-section-card">
      <h3>{title}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </section>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'security-media' ? 'security-media' : 'personal';
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(() => {
    const saved = Number(localStorage.getItem('profileAvatarIndex'));
    return Number.isInteger(saved) && saved >= 0 ? saved : 0;
  });

  const displayName = useMemo(() => {
    if (!user) return 'Guest User';
    if (user.name?.trim()) return user.name.trim();
    return user.email?.split('@')[0] || 'User';
  }, [user]);

  const username = useMemo(() => (user?.email ? user.email.split('@')[0] : ''), [user?.email]);
  const selectedAvatarSrc = AVATAR_IMAGES[selectedAvatarIndex] || '';

  useEffect(() => {
    if (!AVATAR_IMAGES.length) return;
    const safeIndex = Math.min(selectedAvatarIndex, AVATAR_IMAGES.length - 1);
    if (safeIndex !== selectedAvatarIndex) {
      setSelectedAvatarIndex(safeIndex);
      return;
    }
    localStorage.setItem('profileAvatarIndex', String(safeIndex));
    window.dispatchEvent(new Event('profile-avatar-updated'));
  }, [selectedAvatarIndex]);

  return (
    <>
      <Header note="Profile" showNav />
      <main className="profile-page">
        <aside className="profile-sidebar">
          <div className="profile-user-card">
            <div className="profile-avatar">
              {selectedAvatarSrc ? <img src={selectedAvatarSrc} alt="Selected profile avatar" /> : displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>{displayName}</h2>
              <p>@{username || 'username'}</p>
            </div>
          </div>

          <nav className="profile-side-nav" aria-label="Profile sections">
            {PROFILE_SECTION_LINKS.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="profile-side-link">
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <section className="profile-main">
          <div className="profile-breadcrumb">
            <Link to="/">Dashboard</Link>
            <span>›</span>
            <strong>{activeTab === 'security-media' ? 'Account Setting' : 'My Profile'}</strong>
          </div>

          <div className="profile-panel">
            <div className="profile-tabs">
              <button
                type="button"
                className={`profile-tab-btn${activeTab === 'personal' ? ' active' : ''}`}
                onClick={() => setSearchParams({ tab: 'personal' })}
              >
                Personal Info
              </button>
              <button
                type="button"
                className={`profile-tab-btn${activeTab === 'security-media' ? ' active' : ''}`}
                onClick={() => setSearchParams({ tab: 'security-media' })}
              >
                Security &amp; Media
              </button>
            </div>

            {activeTab === 'security-media' ? (
              <section className="profile-section-card">
                <div className="profile-sec-head">
                  <div>
                    <h3>Message Preferences</h3>
                    <p>Please set your message preferences</p>
                  </div>
                  <div className="profile-actions profile-actions-tight">
                    <button type="button" className="profile-btn secondary">
                      Cancel
                    </button>
                    <button type="button" className="profile-btn primary">
                      Save Changes
                    </button>
                  </div>
                </div>
                <div className="profile-divider" />

                <div className="profile-pref-row">
                  <label className="profile-toggle">
                    <input type="checkbox" />
                    <span className="slider" />
                    <span>Send me job updates</span>
                  </label>
                  <label className="profile-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="slider" />
                    <span>Send me Email</span>
                  </label>
                  <label className="profile-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="slider" />
                    <span>Send me Whatsapp</span>
                  </label>
                </div>

                <div className="profile-divider" />

                <div className="profile-sec-block">
                  <h4>Email</h4>
                  <input
                    className="profile-skill-input"
                    value={user?.email || ''}
                    readOnly
                    aria-readonly="true"
                    title="Email cannot be updated here"
                  />
                </div>

                <div className="profile-divider" />

                <div className="profile-sec-block">
                  <h4>Login &amp; Security</h4>
                  <p>Please update your current password</p>
                  <div className="profile-form-grid">
                    <label>
                      New Password
                      <input type="password" placeholder="Enter New Password" />
                    </label>
                    <label>
                      Confirm Password
                      <input type="password" placeholder="Confirm New Password" />
                    </label>
                  </div>
                  <div className="profile-actions profile-actions-tight">
                    <button type="button" className="profile-btn secondary">
                      Reset
                    </button>
                    <button type="button" className="profile-btn primary">
                      Save Password
                    </button>
                  </div>
                </div>

                <div className="profile-divider" />

                <div className="profile-sec-block">
                  <h4>Profile Photo</h4>
                  <p>Update your profile photo</p>
                  <div className="profile-photo-upload">
                    <div className="profile-photo-preview">
                      {selectedAvatarSrc ? (
                        <img src={selectedAvatarSrc} alt="Selected profile avatar preview" />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <label className="profile-dropzone">
                      <input type="file" />
                      <span>Click to Upload or Drag &amp; Drop</span>
                    </label>
                  </div>
                  <p className="profile-avatar-label">Or choose an avatar</p>
                  <div className="profile-avatar-list">
                    {AVATAR_IMAGES.map((avatarSrc, index) => (
                      <button
                        key={avatarSrc}
                        type="button"
                        className={`profile-avatar-chip${selectedAvatarIndex === index ? ' active' : ''}`}
                        onClick={() => setSelectedAvatarIndex(index)}
                        aria-label={`Select avatar ${index + 1}`}
                      >
                        <img src={avatarSrc} alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <>
                <SectionCard id="basic-details" title="My Basic Details" subtitle="Please add full details about yourself">
                  <div className="profile-form-grid">
                    <label>
                      Full Name
                      <input defaultValue={displayName} placeholder="Full name" />
                    </label>
                    <label>
                      Username
                      <input defaultValue={username} placeholder="Username" />
                    </label>
                    <label>
                      Phone Number
                      <input placeholder="Enter mobile number" />
                    </label>
                    <label>
                      Email
                      <input defaultValue={user?.email || ''} placeholder="Email address" />
                    </label>
                    <label className="full">
                      Bio
                      <textarea rows={4} placeholder="Enter bio" />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard id="account-connect" title="Account Connect" subtitle="Please add full details about social connect">
                  <div className="profile-form-grid">
                    <label>
                      Codeforces
                      <input placeholder="Codeforces Profile" />
                    </label>
                    <label>
                      Github
                      <input placeholder="Github Profile" />
                    </label>
                    <label>
                      Leetcode
                      <input placeholder="Leetcode Profile" />
                    </label>
                    <label>
                      Linkedin
                      <input placeholder="Linkedin Profile" />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard id="education" title="Education" subtitle="Please add full details about your education">
                  <div className="profile-form-grid">
                    <label className="full">
                      Institution
                      <input placeholder="Search your institution" />
                    </label>
                    <label>
                      Degree
                      <input placeholder="Select degree" />
                    </label>
                    <label>
                      Branch
                      <input placeholder="Select branch" />
                    </label>
                    <label>
                      Start Date
                      <input placeholder="Select month / year" />
                    </label>
                    <label>
                      End Date
                      <input placeholder="Select month / year" />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard id="experience" title="Experience" subtitle="Please add full details about your experience">
                  <div className="profile-form-grid">
                    <label>
                      Title
                      <input placeholder="Ex: Retail Sales Manager" />
                    </label>
                    <label>
                      Employment Type
                      <input placeholder="Select type" />
                    </label>
                    <label>
                      Company or Organization
                      <input placeholder="Ex: Microsoft" />
                    </label>
                    <label>
                      Location
                      <input placeholder="Enter your job location" />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard id="resume" title="Add Your Resume" subtitle="Please upload your resume">
                  <div className="profile-upload-row">
                    <input type="file" />
                    <button type="button" className="profile-btn primary">
                      Upload
                    </button>
                  </div>
                </SectionCard>

                <SectionCard id="skills" title="Skills" subtitle="Please add your skills">
                  <input className="profile-skill-input" placeholder="Add a skill..." />
                </SectionCard>

                <div className="profile-actions">
                  <button type="button" className="profile-btn secondary">
                    Cancel
                  </button>
                  <button type="button" className="profile-btn primary">
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import api from '../api/client';

const PROFILE_SECTION_LINKS = [
  { id: 'basic-details', label: 'My Basic Details' },
  { id: 'account-connect', label: 'Account Connect' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'resume', label: 'Add Your Resume' },
  { id: 'skills', label: 'Skills' }
];

const PROFILE_SECURITY_LINKS = [
  { id: 'message-preferences', label: 'Message Preferences' },
  { id: 'email-settings', label: 'Email' },
  { id: 'login-security', label: 'Login & Security' },
  { id: 'profile-photo', label: 'Profile Photo' }
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
  const { user, avatar, setAvatar } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'security-media' ? 'security-media' : 'personal';
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(() => {
    return Number.isInteger(avatar?.presetIndex) && avatar.presetIndex >= 0 ? avatar.presetIndex : 0;
  });
  const [uploadedAvatarSrc, setUploadedAvatarSrc] = useState(() => avatar?.data || '');
  const [uploadError, setUploadError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeSaved, setResumeSaved] = useState(null);
  const [resumeError, setResumeError] = useState('');

  const displayName = useMemo(() => {
    if (!user) return 'Guest User';
    if (user.name?.trim()) return user.name.trim();
    return user.email?.split('@')[0] || 'User';
  }, [user]);

  const username = useMemo(() => (user?.email ? user.email.split('@')[0] : ''), [user?.email]);
  const selectedAvatarSrc = uploadedAvatarSrc || AVATAR_IMAGES[selectedAvatarIndex] || '';
  const sideNavLinks = activeTab === 'security-media' ? PROFILE_SECURITY_LINKS : PROFILE_SECTION_LINKS;

  useEffect(() => {
    if (!AVATAR_IMAGES.length) return;
    const safeIndex = Math.min(Number.isInteger(avatar?.presetIndex) ? avatar.presetIndex : 0, Math.max(0, AVATAR_IMAGES.length - 1));
    setSelectedAvatarIndex(safeIndex);
    setUploadedAvatarSrc(avatar?.data || '');
  }, [avatar]);

  useEffect(() => {
    let cancelled = false;

    async function loadResume() {
      try {
        const { data } = await api.get('/auth/resume');
        if (!cancelled) {
          setResumeSaved(data.resume || null);
        }
      } catch {
        if (!cancelled) {
          setResumeSaved(null);
        }
      }
    }

    loadResume();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Please upload an image smaller than 2 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      try {
        const { data } = await api.put('/auth/avatar', {
          presetIndex: selectedAvatarIndex,
          data: result,
          type: file.type || 'image/*',
          size: file.size
        });
        setAvatar(data.avatar || null);
        setUploadError('');
      } catch (error) {
        setUploadError(error?.response?.data?.error || 'Could not save that image. Try another one.');
      }
    };
    reader.onerror = () => {
      setUploadError('Could not read that image. Try another one.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function handlePresetAvatarSelect(index) {
    api
      .put('/auth/avatar', {
        presetIndex: index,
        data: '',
        type: '',
        size: 0
      })
      .then(({ data }) => {
        setAvatar(data.avatar || null);
        setUploadError('');
      })
      .catch((error) => {
        setUploadError(error?.response?.data?.error || 'Could not save avatar choice. Try again.');
      });
  }

  function handleResumeSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setResumeError('Please upload a resume smaller than 5 MB.');
      setResumeFile(null);
      event.target.value = '';
      return;
    }
    setResumeFile(file);
    setResumeError('');
  }

  function handleResumeUpload() {
    if (!resumeFile) {
      setResumeError('Please choose a resume first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const payload = {
        name: resumeFile.name,
        size: resumeFile.size,
        type: resumeFile.type || 'application/octet-stream',
        data: typeof reader.result === 'string' ? reader.result : ''
      };

      try {
        const { data } = await api.put('/auth/resume', payload);
        setResumeSaved(data.resume || null);
        setResumeFile(null);
        setResumeError('');
      } catch (error) {
        setResumeError(error?.response?.data?.error || 'Could not upload this resume. Try again.');
      }
    };
    reader.onerror = () => {
      setResumeError('Could not read that file. Try again.');
    };
    reader.readAsDataURL(resumeFile);
  }

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
            {sideNavLinks.map((item) => (
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
              <section id="message-preferences" className="profile-section-card">
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

                <div id="email-settings" className="profile-sec-block profile-anchor-block">
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

                <div id="login-security" className="profile-sec-block profile-anchor-block">
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

                <div id="profile-photo" className="profile-sec-block profile-anchor-block">
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
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                      <span>Click to Upload or Drag &amp; Drop</span>
                    </label>
                  </div>
                  {uploadError ? <p className="profile-upload-error">{uploadError}</p> : null}
                  {uploadedAvatarSrc ? <p className="profile-upload-hint">Uploaded photo is active. Choosing an avatar below will replace it.</p> : null}
                  <p className="profile-avatar-label">Or choose an avatar</p>
                  <div className="profile-avatar-list">
                    {AVATAR_IMAGES.map((avatarSrc, index) => (
                      <button
                        key={avatarSrc}
                        type="button"
                        className={`profile-avatar-chip${!uploadedAvatarSrc && selectedAvatarIndex === index ? ' active' : ''}`}
                        onClick={() => handlePresetAvatarSelect(index)}
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
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeSelect} />
                    <button type="button" className="profile-btn primary" onClick={handleResumeUpload}>
                      Upload
                    </button>
                  </div>
                  {resumeError ? <p className="profile-upload-error">{resumeError}</p> : null}
                  {!resumeError && resumeFile ? <p className="profile-upload-hint">Ready to upload: {resumeFile.name}</p> : null}
                  {!resumeFile && resumeSaved ? (
                    <p className="profile-upload-hint">
                      Uploaded resume: {resumeSaved.name}
                    </p>
                  ) : null}
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

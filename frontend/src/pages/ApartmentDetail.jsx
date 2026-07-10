import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { stars, formatDate } from '../data/mockData';
import TopNav from '../components/TopNav';
import ReviewModal from '../components/ReviewModal';
import EditModal from '../components/EditModal';
import DeleteModal from '../components/DeleteModal';

const API = import.meta.env.VITE_API_URL || '';

export default function ApartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const aptId = Number(id);
  const { apartments, getAptRating, getAptReviewCount } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [aptReviews, setAptReviews] = useState([]);
  const [aptComments, setAptComments] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editReviewObj, setEditReviewObj] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentText, setCommentText] = useState({});

  const apt = apartments.find((a) => a.id === aptId);
  if (!apt) return null;

  const rating = getAptRating(apt.id);
  const count = aptReviews.length;
  const revs = [...aptReviews].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  useEffect(() => {
    async function loadApartmentData() {
      try {
        const [reviewsRes, commentsRes] = await Promise.all([
          fetch(`${API}/api/apartments/${aptId}/reviews`),
          fetch(`${API}/api/apartments/${aptId}/comments`),
        ]);

        if (reviewsRes.ok) {
          setAptReviews(await reviewsRes.json());
        }
        if (commentsRes.ok) {
          setAptComments(await commentsRes.json());
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadApartmentData();
  }, [aptId]);

  function handleGenerate() {
    setAiLoading(true);
    setTimeout(() => {
      showToast('AI summary generated', 'success');
      setAiLoading(false);
    }, 1800);
  }

  function toggleComments(reviewId) {
    setOpenComments((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
  }

  async function postComment(reviewId) {
    const body = (commentText[reviewId] || '').trim();
    if (!body || !user) return;

    try {
      const response = await fetch(
        `${API}/api/apartments/${apt.id}/reviews/${reviewId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ body }),
        },
      );

      if (!response.ok) {
        showToast('Unable to post comment', 'error');
        return;
      }

      setCommentText((prev) => ({ ...prev, [reviewId]: '' }));
      const commentsRes = await fetch(
        `${API}/api/apartments/${apt.id}/comments`,
      );
      if (commentsRes.ok) {
        setAptComments(await commentsRes.json());
      }
      showToast('Comment posted', 'success');
    } catch (err) {
      console.error(err);
      showToast('Unable to post comment', 'error');
    }
  }

  return (
    <div className="view active">
      <div className="app-shell">
        <TopNav />
        <div className="content-area">
          <div className="view active">
            <div className="detail-back" onClick={() => navigate('/app')}>
              ← Back to all apartments
            </div>

            <div className="detail-hero">
              <div>
                <h1>{apt.name}</h1>
                <div className="neighbourhood">
                  📍 {apt.address} · {apt.neighbourhood}
                </div>
                <p
                  style={{
                    color: 'var(--gray-500)',
                    fontSize: '14px',
                    marginTop: '8px',
                  }}
                >
                  {apt.description}
                </p>
              </div>
              <div className="detail-rating">
                <div className="big-num">{rating.toFixed(1)}</div>
                <div className="stars">{stars(rating)}</div>
                <div className="count">{count} reviews</div>
              </div>
            </div>

            <div className="detail-grid">
              <div>
                <div className="ai-card">
                  {aiLoading ? (
                    <>
                      <div className="ai-label">✨ AI Summary</div>
                      <div className="ai-loading">
                        <div className="spinner"></div>Analysing {count} reviews
                        with Groq...
                      </div>
                    </>
                  ) : apt.aiSummary ? (
                    <>
                      <div className="ai-label">✨ AI-Generated Summary</div>
                      <p>{apt.aiSummary}</p>
                    </>
                  ) : (
                    <>
                      <div className="ai-label">✨ AI Summary</div>
                      <p
                        style={{
                          color: 'var(--gray-400)',
                          fontStyle: 'italic',
                          marginBottom: '12px',
                        }}
                      >
                        No summary generated yet. Click below to generate one
                        from existing reviews.
                      </p>
                      <button
                        className="btn btn-secondary btn-sm generate-btn"
                        onClick={handleGenerate}
                      >
                        Generate AI Summary
                      </button>
                    </>
                  )}
                </div>

                {apt.aiIssues && apt.aiIssues.length > 0 && (
                  <div className="key-issues" style={{ display: 'block' }}>
                    <h3>Key Issues</h3>
                    <div className="issues-list">
                      {apt.aiIssues.map((i, idx) => (
                        <span className="tag" key={idx}>
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="reviews-section">
                  <div className="reviews-header">
                    <h3>Reviews ({revs.length})</h3>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setReviewOpen(true)}
                    >
                      + Write a Review
                    </button>
                  </div>
                  {revs.map((r) => {
                    const cs = aptComments.filter((c) => c.reviewId === r.id);
                    const isOwn = user && r.userId === user.id;
                    const show = openComments[r.id] ?? cs.length > 0;
                    return (
                      <div className="review-item" key={r.id}>
                        <div className="review-top">
                          <div className="review-author">
                            <div
                              className="avatar"
                              style={{
                                background: isOwn
                                  ? 'var(--blue-100)'
                                  : 'var(--gray-100)',
                                color: isOwn
                                  ? 'var(--blue-600)'
                                  : 'var(--gray-500)',
                              }}
                            >
                              {r.initials || '??'}
                            </div>
                            <div className="info">
                              <div className="name">
                                {r.author || 'Anonymous'}
                                {isOwn ? ' (you)' : ''}
                              </div>
                              <div className="date">{formatDate(r.date)}</div>
                            </div>
                          </div>
                          <div className="review-stars">{stars(r.rating)}</div>
                        </div>
                        <div className="review-body">{r.body}</div>
                        {r.media?.length > 0 && (
                          <div className="review-media">
                            {r.media.map((m, idx) => (
                              <div className="media-thumb" key={idx}>
                                {m === 'video' ? '🎥' : '📷'}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="review-actions">
                          <button onClick={() => toggleComments(r.id)}>
                            💬 {cs.length} comment{cs.length !== 1 ? 's' : ''}
                          </button>
                          {isOwn && (
                            <button onClick={() => setEditReviewObj(r)}>
                              ✏️ Edit
                            </button>
                          )}
                          {isOwn && (
                            <button onClick={() => setDeleteId(r.id)}>
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                        {show && (
                          <div
                            className="comments-section"
                            style={{ display: 'block' }}
                          >
                            {cs.map((c) => (
                              <div className="comment-item" key={c.id}>
                                <span className="comment-author">
                                  {c.author || 'Anonymous'}
                                </span>
                                <span className="comment-date">
                                  {formatDate(c.date)}
                                </span>
                                <div className="comment-body">{c.body}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {show && (
                          <div
                            className="comment-form"
                            style={{ display: 'flex' }}
                          >
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentText[r.id] || ''}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [r.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) =>
                                e.key === 'Enter' && postComment(r.id)
                              }
                            />
                            <button onClick={() => postComment(r.id)}>
                              Reply
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="detail-sidebar">
                <div className="sidebar-card">
                  <h4>Property Info</h4>
                  <div className="sidebar-row">
                    <span className="label">Landlord</span>
                    <span className="value">{apt.landlord}</span>
                  </div>
                  <div className="sidebar-row">
                    <span className="label">Units</span>
                    <span className="value">{apt.units}</span>
                  </div>
                  <div className="sidebar-row">
                    <span className="label">Year built</span>
                    <span className="value">{apt.built}</span>
                  </div>
                  <div className="sidebar-row">
                    <span className="label">Neighbourhood</span>
                    <span className="value">{apt.neighbourhood}</span>
                  </div>
                </div>
                <div className="sidebar-card">
                  <h4>Rating Breakdown</h4>
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c = aptReviews.filter((r) => r.rating === n).length;
                    const pct = count ? (c / count) * 100 : 0;
                    return (
                      <div
                        key={n}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            width: '14px',
                            textAlign: 'right',
                            color: 'var(--gray-500)',
                          }}
                        >
                          {n}
                        </span>
                        <span
                          style={{
                            color: 'var(--amber-400)',
                            fontSize: '12px',
                          }}
                        >
                          ★
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: '8px',
                            background: 'var(--gray-100)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: pct + '%',
                              background: 'var(--blue-500)',
                              borderRadius: '4px',
                              transition: 'width 0.3s',
                            }}
                          ></div>
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--gray-400)',
                            width: '20px',
                          }}
                        >
                          {c}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setReviewOpen(true)}
                >
                  Write a Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmit={async (rating, body) => {
          if (!user) {
            showToast('Please sign in to submit a review', 'error');
            return;
          }

          try {
            const response = await fetch(
              `${API}/api/apartments/${apt.id}/reviews`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ rating, body }),
              },
            );

            if (!response.ok) {
              showToast('Unable to save review', 'error');
              return;
            }

            const reviewsRes = await fetch(
              `${API}/api/apartments/${apt.id}/reviews`,
            );
            if (reviewsRes.ok) {
              setAptReviews(await reviewsRes.json());
            }
            setReviewOpen(false);
            showToast('Review submitted!', 'success');
          } catch (err) {
            console.error(err);
            showToast('Unable to save review', 'error');
          }
        }}
      />
      <EditModal
        open={!!editReviewObj}
        review={editReviewObj}
        onClose={() => setEditReviewObj(null)}
        onSave={async (rid, rating, body) => {
          try {
            const response = await fetch(
              `${API}/api/apartments/reviews/${rid}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ rating, body }),
              },
            );

            if (!response.ok) {
              showToast('Unable to update review', 'error');
              return;
            }

            const reviewsRes = await fetch(
              `${API}/api/apartments/${apt.id}/reviews`,
            );
            if (reviewsRes.ok) {
              setAptReviews(await reviewsRes.json());
            }
            setEditReviewObj(null);
            showToast('Review updated', 'success');
          } catch (err) {
            console.error(err);
            showToast('Unable to update review', 'error');
          }
        }}
      />
      <DeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            const response = await fetch(
              `${API}/api/apartments/reviews/${deleteId}`,
              {
                method: 'DELETE',
                credentials: 'include',
              },
            );
            if (!response.ok) {
              showToast('Unable to delete review', 'error');
              return;
            }
            const reviewsRes = await fetch(
              `${API}/api/apartments/${apt.id}/reviews`,
            );
            if (reviewsRes.ok) {
              setAptReviews(await reviewsRes.json());
            }
            setDeleteId(null);
            showToast('Review deleted', 'success');
          } catch (err) {
            console.error(err);
            showToast('Unable to delete review', 'error');
          }
        }}
      />
    </div>
  );
}

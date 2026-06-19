import React, { useState, useEffect } from 'react';
import API_URL, { secureLocalFetch } from '../config';

const OPT_LABELS = ['A', 'B', 'C', 'D'];

function getStars(score, maxScore) {
  if (!maxScore) return 0;
  const pct = score / maxScore;
  if (pct >= 0.8) return 3;
  if (pct >= 0.5) return 2;
  if (pct > 0)    return 1;
  return 0;
}

/* ─────────────────────────────────────────── FinishScreen ── */
function FinishScreen({ score, maxScore, questions, resetAt, submitting }) {
  const stars    = getStars(score, maxScore);
  const pct      = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const perfect  = score === maxScore;
  const countdown = useCountdown(resetAt);

  return (
    <div style={{ padding: '8px 0', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#4a2a0a 0%,#8d4d11 60%,#b87333 100%)',
        borderRadius: 24, padding: '40px 32px', textAlign: 'center',
        position: 'relative', overflow: 'hidden', marginBottom: 24,
        boxShadow: '0 12px 40px rgba(141,77,17,0.35)',
      }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{perfect ? '🏆' : stars >= 2 ? '🎉' : '👍'}</div>
          <h2 style={{ margin:'0 0 6px', fontSize: 26, fontWeight: 800, color:'#fff' }}>
            {perfect ? 'เยี่ยมมาก! คะแนนเต็ม!' : stars >= 2 ? 'เก่งมาก!' : 'ไม่เป็นไร!'}
          </h2>
          <p style={{ margin:'0 0 28px', color:'rgba(255,255,255,0.75)', fontSize:14 }}>
            คุณทำได้ {pct}% ของคะแนนทั้งหมด
          </p>

          {/* Stars */}
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:28 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{
                fontSize: 36,
                filter: s <= stars ? 'drop-shadow(0 0 8px rgba(253,224,71,0.8))' : 'none',
                opacity: s <= stars ? 1 : 0.25,
                transform: s <= stars ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.3s',
              }}>⭐</div>
            ))}
          </div>

          {/* Score box */}
          <div style={{
            background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)',
            borderRadius: 20, padding: '20px 32px', display:'inline-block',
            border:'1px solid rgba(255,255,255,0.2)',
          }}>
            <p style={{ margin:'0 0 4px', fontSize:13, color:'rgba(255,255,255,0.75)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>คะแนนที่ได้</p>
            <p style={{ margin:0, fontSize:52, fontWeight:900, color:'#fff', lineHeight:1 }}>{score}</p>
            <p style={{ margin:'4px 0 0', fontSize:13, color:'rgba(255,255,255,0.6)' }}>จาก {maxScore} แต้ม</p>
          </div>
        </div>
      </div>

      {/* Question summary */}
      <div style={{ background:'#fff8f0', borderRadius:18, padding:'18px 20px', marginBottom:24, border:'1px solid #ede9e3' }}>
        <p style={{ margin:'0 0 14px', fontWeight:700, fontSize:14, color:'#3d1a05' }}>📋 สรุปผล</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#7a5c40' }}>
              <div style={{ width:22, height:22, borderRadius:8, background:'rgba(141,77,17,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, color:'#8d4d11' }}>
                {i+1}
              </div>
              <span style={{ flex:1, lineHeight:1.4 }}>{q.question.length > 45 ? q.question.slice(0,45)+'…' : q.question}</span>
              <span style={{ fontWeight:700, color:'#8d4d11', flexShrink:0 }}>+{q.points}</span>
            </div>
          ))}
        </div>
      </div>

      {submitting ? (
        <div style={{ textAlign:'center', padding:'14px', color:'#b89a7a', fontSize:14, fontWeight:600 }}>⏳ กำลังบันทึกแต้ม...</div>
      ) : (
        <div style={{ background:'#fff8f0', borderRadius:16, padding:'16px 20px', border:'1px solid #ede9e3', textAlign:'center' }}>
          <p style={{ margin:'0 0 4px', fontSize:13, color:'#7a5c40' }}>🔄 ชุดคำถามใหม่จะมาในอีก</p>
          <p style={{ margin:0, fontSize:28, fontWeight:900, color:'#8d4d11', fontFamily:'monospace' }}>{countdown}</p>
          <p style={{ margin:'4px 0 0', fontSize:12, color:'#b89a7a' }}>รีเซ็ตทุกเที่ยงคืน</p>
        </div>
      )}
    </div>
  );
}

/* ─── Countdown to midnight ──────────────────────────────────── */
function useCountdown(resetAt) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!resetAt) return;
    const tick = () => {
      const diff = new Date(resetAt) - new Date();
      if (diff <= 0) { setTimeLeft('00:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetAt]);
  return timeLeft;
}

/* ─── Already played screen ──────────────────────────────────── */
function AlreadyPlayedScreen({ score, resetAt }) {
  const countdown = useCountdown(resetAt);
  return (
    <div style={{ padding:'8px 0', textAlign:'center', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ background:'linear-gradient(135deg,#4a2a0a,#8d4d11)', borderRadius:24, padding:'36px 28px', marginBottom:20, color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
        <div style={{ fontSize:56, marginBottom:10 }}>✅</div>
        <h2 style={{ margin:'0 0 8px', fontSize:22, fontWeight:800 }}>เล่นแล้ววันนี้!</h2>
        <p style={{ margin:'0 0 20px', color:'rgba(255,255,255,0.8)', fontSize:14 }}>คุณได้เล่น Quiz ชุดวันนี้ครบแล้ว</p>
        <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:14, padding:'14px 20px', display:'inline-block' }}>
          <p style={{ margin:'0 0 4px', fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>คะแนนที่ได้วันนี้</p>
          <p style={{ margin:0, fontSize:40, fontWeight:900 }}>⭐ {score}</p>
        </div>
      </div>
      <div style={{ background:'#fff8f0', borderRadius:16, padding:'20px', border:'1px solid #ede9e3' }}>
        <p style={{ margin:'0 0 6px', fontSize:13, color:'#7a5c40' }}>ชุดคำถามใหม่จะมาในอีก</p>
        <p style={{ margin:0, fontSize:32, fontWeight:900, color:'#8d4d11', letterSpacing:'0.05em', fontFamily:'monospace' }}>{countdown}</p>
        <p style={{ margin:'6px 0 0', fontSize:12, color:'#b89a7a' }}>รีเซ็ตทุกเที่ยงคืน</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── Main Component ── */
export default function GameQuiz() {
  const [questions,       setQuestions]       = useState([]);
  const [loadingQ,        setLoadingQ]        = useState(true);
  const [fetchError,      setFetchError]      = useState(null);
  const [sessionId,       setSessionId]       = useState(null);
  const [alreadyPlayed,   setAlreadyPlayed]   = useState(false);
  const [todayScore,      setTodayScore]      = useState(0);
  const [resetAt,         setResetAt]         = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score,           setScore]           = useState(0);
  const [answered,        setAnswered]        = useState(false);
  const [selectedAnswer,  setSelectedAnswer]  = useState(null);
  const [gameFinished,    setGameFinished]    = useState(false);
  const [submitting,      setSubmitting]      = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { setLoadingQ(false); return; }
    secureLocalFetch(`${API_URL}/quiz/daily`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) { setFetchError(d.error || 'เกิดข้อผิดพลาด'); return; }
        setResetAt(d.reset_at);
        if (d.already_played) {
          setAlreadyPlayed(true);
          setTodayScore(d.score || 0);
        } else if (Array.isArray(d.questions) && d.questions.length > 0) {
          setSessionId(d.session_id);
          setQuestions(d.questions.map(q => ({
            id: q.question_id,
            question: q.question,
            options: [q.option_a, q.option_b, q.option_c, q.option_d],
            correct: q.correct_answer,
            points: q.points,
          })));
        } else {
          setFetchError('ยังไม่มีคำถามในระบบ กรุณาติดต่อผู้ดูแล');
        }
      })
      .catch(() => setFetchError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'))
      .finally(() => setLoadingQ(false));
  }, []);

  const maxScore = questions.reduce((s, q) => s + q.points, 0);
  const question  = questions[currentQuestion];
  const isCorrect = question && selectedAnswer === question.correct;
  const progress  = questions.length ? (currentQuestion / questions.length) * 100 : 0;

  const handleAnswerClick = (index) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    if (index === question.correct) setScore(s => s + question.points);
  };

  const handleNext = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(q => q + 1);
      setAnswered(false);
      setSelectedAnswer(null);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setGameFinished(true);
    if (!token || !sessionId) return;
    setSubmitting(true);
    try {
      await secureLocalFetch(`${API_URL}/quiz/daily/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId, score }),
      });
    } catch {}
    setSubmitting(false);
  };

  if (loadingQ) return (
    <div style={{ padding:32, textAlign:'center', color:'#b89a7a' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
      <p style={{ fontWeight:600, margin:0 }}>กำลังโหลดคำถามวันนี้...</p>
    </div>
  );
  if (!token) return (
    <div style={{ padding:32, textAlign:'center', color:'#b89a7a' }}>
      <p style={{ fontSize:28, margin:'0 0 8px' }}>🔒</p>
      <p style={{ fontWeight:600, margin:0 }}>กรุณาเข้าสู่ระบบก่อนเล่น Quiz</p>
    </div>
  );
  if (alreadyPlayed) return <AlreadyPlayedScreen score={todayScore} resetAt={resetAt} />;
  if (fetchError) return (
    <div style={{ padding:32, textAlign:'center', color:'#b89a7a' }}>
      <p style={{ fontSize:36, margin:'0 0 8px' }}>⚠️</p>
      <p style={{ fontWeight:700, fontSize:15, color:'#5c3a1e', margin:'0 0 6px' }}>{fetchError}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop:12, padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#8d4d11,#6b3a0d)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
        ลองใหม่
      </button>
    </div>
  );
  if (gameFinished) return <FinishScreen score={score} maxScore={maxScore} questions={questions} resetAt={resetAt} submitting={submitting} />;

  const isLastQuestion = currentQuestion + 1 === questions.length;

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop         { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
        .quiz-opt:hover:not(:disabled) { transform:translateY(-2px) !important; box-shadow:0 8px 24px rgba(141,77,17,0.12) !important; }
      `}</style>

      {/* ── Header gradient bar ─── */}
      <div style={{
        background:'linear-gradient(135deg,#4a2a0a 0%,#8d4d11 60%,#b87333 100%)',
        borderRadius:20, padding:'22px 24px', marginBottom:22,
        position:'relative', overflow:'hidden',
        boxShadow:'0 8px 28px rgba(141,77,17,0.35)',
      }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <p style={{ margin:'0 0 3px', fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>คำถาม</p>
            <p style={{ margin:0, fontSize:24, fontWeight:900, color:'#fff', lineHeight:1 }}>
              {currentQuestion + 1} <span style={{ fontSize:16, fontWeight:400, color:'rgba(255,255,255,0.6)' }}>/ {questions.length}</span>
            </p>
          </div>

          <div style={{ textAlign:'right' }}>
            <p style={{ margin:'0 0 3px', fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>คะแนน</p>
            <p style={{ margin:0, fontSize:24, fontWeight:900, color:'#fff', lineHeight:1 }}>
              ⭐ {score}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:16, height:6, borderRadius:99, background:'rgba(255,255,255,0.2)', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:99, background:'rgba(255,255,255,0.9)', width:`${progress}%`, transition:'width 0.5s ease', boxShadow:'0 0 8px rgba(255,255,255,0.4)' }} />
        </div>

        {/* Step dots */}
        <div style={{ display:'flex', gap:6, marginTop:10, justifyContent:'center' }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: i === currentQuestion ? 20 : 8,
              height: 8, borderRadius: 99,
              background: i <= currentQuestion ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      {/* ── Question card ─── */}
      <div style={{
        background:'#fff8f0', borderRadius:20, padding:'22px 24px', marginBottom:20,
        border:'1px solid #ede9e3',
        animation:'fadeSlideIn 0.35s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#8d4d11,#6b3a0d)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🧠</div>
          <p style={{ margin:0, fontSize:12, fontWeight:700, color:'#8d4d11', letterSpacing:'0.08em', textTransform:'uppercase' }}>ข้อที่ {currentQuestion + 1} · {question.points} แต้ม</p>
        </div>
        <p style={{ margin:0, fontSize:17, fontWeight:700, color:'#3d1a05', lineHeight:1.6 }}>{question.question}</p>
      </div>

      {/* ── Options ─── */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isRight    = answered && index === question.correct;
          const isWrong    = answered && isSelected && !isCorrect;

          let bg         = '#fff';
          let border     = '1.5px solid #ede9e3';
          let color      = '#3d1a05';
          let badgeBg    = '#f4f2ef';
          let badgeColor = '#7a5c40';
          let shadow     = '0 2px 8px rgba(0,0,0,0.04)';

          if (isRight) {
            bg = '#f0fdf4'; border = '1.5px solid #bbf7d0'; color = '#166534';
            badgeBg = '#22c55e'; badgeColor = '#fff'; shadow = '0 6px 20px rgba(34,197,94,0.2)';
          } else if (isWrong) {
            bg = '#fff0e8'; border = '1.5px solid #e8b895'; color = '#4a2008';
            badgeBg = '#8d4d11'; badgeColor = '#fff'; shadow = '0 4px 12px rgba(141,77,17,0.15)';
          } else if (!answered) {
            shadow = '0 2px 8px rgba(0,0,0,0.04)';
          } else {
            bg = '#f4f2ef'; color = '#b89a7a'; border = '1.5px solid #ede9e3';
          }

          return (
            <button
              key={index}
              className="quiz-opt"
              onClick={() => handleAnswerClick(index)}
              disabled={answered}
              style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'14px 18px', borderRadius:16, border, background: bg,
                cursor: answered ? 'not-allowed' : 'pointer',
                textAlign:'left', transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: shadow,
                animation: (isRight || isWrong) ? 'pop 0.35s ease' : 'none',
              }}
            >
              <div style={{
                width:34, height:34, borderRadius:10, background: badgeBg, color: badgeColor,
                fontSize:13, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                transition:'all 0.25s',
              }}>
                {isRight ? '✓' : isWrong ? '✗' : OPT_LABELS[index]}
              </div>
              <span style={{ fontSize:15, fontWeight:500, color, flex:1, lineHeight:1.4 }}>{option}</span>
              {isRight && <span style={{ fontSize:12, fontWeight:700, color:'#16a34a', flexShrink:0 }}>+{question.points} แต้ม</span>}
            </button>
          );
        })}
      </div>

      {/* ── Feedback + actions ─── */}
      {answered && (
        <div style={{ animation:'fadeSlideIn 0.3s ease' }}>
          {/* Result banner */}
          <div style={{
            borderRadius:16, padding:'14px 18px', marginBottom:14,
            background: isCorrect ? '#f0fdf4' : '#fff0e8',
            border: `1px solid ${isCorrect ? '#bbf7d0' : '#e8b895'}`,
            display:'flex', alignItems:'center', gap:12,
          }}>
            <span style={{ fontSize:22 }}>{isCorrect ? '🎉' : '😅'}</span>
            <div>
              <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:14, color: isCorrect ? '#166534' : '#4a2008' }}>
                {isCorrect ? `ถูกต้อง! ได้ ${question.points} แต้ม` : 'ตอบผิดแล้ว'}
              </p>
              {!isCorrect && (
                <p style={{ margin:0, fontSize:13, color:'#7a5c40' }}>
                  คำตอบที่ถูกต้องคือ <strong style={{ color:'#3d1a05' }}>{question.options[question.correct]}</strong>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleNext}
            style={{
              width:'100%', padding:'14px', borderRadius:14, border:'none',
              background:'linear-gradient(135deg,#8d4d11,#6b3a0d)',
              color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer',
              boxShadow:'0 6px 20px rgba(141,77,17,0.35)', transition:'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(141,77,17,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(141,77,17,0.35)'; }}
          >
            {isLastQuestion ? '🏁 ดูผลลัพธ์' : 'คำถามถัดไป →'}
          </button>
        </div>
      )}
    </div>
  );
}

import {
  BookOpen,
  Check,
  ChevronDown,
  GraduationCap,
  LogOut,
  Search,
  Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { findTeacherStudent, type TeacherCourse, type TeacherStudent } from "./api";
import "./teacher.css";

type Props = {
  email: string;
  onOpenAccount: () => void;
  onSignOut: () => void;
};

function percent(completed: number, total: number) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function latestCourseDate(student: TeacherStudent) {
  return student.courses
    .map((course) => course.updatedAt)
    .sort()
    .at(-1) ?? student.joinedAt;
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function CourseCard({ course }: { course: TeacherCourse }) {
  const planPercent = percent(course.planCompleted, course.planTotal);
  const quizPercent = percent(course.quizCorrect, course.quizAnswered);
  const questPercent = percent(course.questSolved, course.questTotal);

  return (
    <article className="teacher-course-card">
      <header>
        <span className="teacher-course-icon"><BookOpen size={17} /></span>
        <div>
          <h3>{course.name}</h3>
          <p>{course.pageCount} pages · Updated {dateLabel(course.updatedAt)}</p>
        </div>
        <span className={`teacher-course-status ${course.hasStudyKit ? "ready" : ""}`}>
          {course.hasStudyKit ? "Study kit ready" : "Source only"}
        </span>
      </header>
      {course.hasStudyKit ? (
        <div className="teacher-course-progress">
          <div>
            <span><strong>{course.planCompleted}</strong> / {course.planTotal} plan tasks</span>
            <span>{planPercent}%</span>
            <progress max="100" value={planPercent} />
          </div>
          <div>
            <span><strong>{course.quizCorrect}</strong> / {course.quizAnswered} quiz answers correct</span>
            <span>{quizPercent}%</span>
            <progress max="100" value={quizPercent} />
          </div>
          <div>
            <span><strong>{course.questSolved}</strong> / {course.questTotal} quest rooms</span>
            <span>{questPercent}%</span>
            <progress max="100" value={questPercent} />
          </div>
          <p className="teacher-current-step">
            Current stage: <strong>{course.currentStep ?? "not started"}</strong>
          </p>
        </div>
      ) : (
        <p className="teacher-course-empty">The student has saved this source file but has not generated a study kit.</p>
      )}
    </article>
  );
}

function StudentCard({ student }: { student: TeacherStudent }) {
  const [expanded, setExpanded] = useState(true);
  const name = student.displayName?.trim() || student.email.split("@")[0];
  const planCompleted = student.courses.reduce((sum, course) => sum + course.planCompleted, 0);
  const planTotal = student.courses.reduce((sum, course) => sum + course.planTotal, 0);
  const quizCorrect = student.courses.reduce((sum, course) => sum + course.quizCorrect, 0);
  const quizAnswered = student.courses.reduce((sum, course) => sum + course.quizAnswered, 0);

  return (
    <article className="teacher-student-card">
      <button
        aria-expanded={expanded}
        className="teacher-student-summary"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span className="teacher-avatar">{name.slice(0, 1).toUpperCase()}</span>
        <span className="teacher-student-identity">
          <strong>{name}</strong>
          <small>{student.email}</small>
        </span>
        <span className="teacher-student-metrics">
          <span><strong>{student.courses.length}</strong> courses</span>
          <span><strong>{planCompleted}/{planTotal}</strong> tasks</span>
          <span><strong>{quizCorrect}/{quizAnswered}</strong> quiz</span>
          <span>Active {dateLabel(latestCourseDate(student))}</span>
        </span>
        <ChevronDown className={expanded ? "expanded" : ""} size={19} />
      </button>
      {expanded ? (
        <div className="teacher-student-detail">
          {student.courses.length ? student.courses.map((course) => (
            <CourseCard course={course} key={course.id} />
          )) : (
            <p className="teacher-no-courses">No course activity yet.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

export default function TeacherDashboard({ email, onOpenAccount, onSignOut }: Props) {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = query.trim();
    if (!identifier || loading) return;
    setLoading(true);
    setError("");
    setStudents([]);
    setLastQuery(identifier);
    try {
      setStudents(await findTeacherStudent(identifier));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const courseCount = students.reduce((sum, student) => sum + student.courses.length, 0);
  const activeStudents = students.filter((student) => student.courses.length > 0).length;

  return (
    <div className="teacher-page">
      <header className="teacher-topbar">
        <div className="teacher-brand">
          <span><GraduationCap size={23} /></span>
          <div><strong>Pathwise</strong><small>Teacher dashboard</small></div>
        </div>
        <div className="teacher-account-actions">
          <button className="button secondary" onClick={onOpenAccount} type="button">{email}</button>
          <button className="teacher-signout" onClick={onSignOut} type="button">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="teacher-main">
        <section className="teacher-hero">
          <div>
            <p className="eyebrow">Student learning overview</p>
            <h1>Look up a student’s progress.</h1>
            <p>Enter a student email address or Supabase user ID to review course activity, learning-plan completion, quiz performance, and knowledge-quest progress.</p>
          </div>
        </section>

        <section className="teacher-stat-grid" aria-label="Dashboard summary">
          <article><Users size={21} /><span><strong>{students.length}</strong><small>Matching students</small></span></article>
          <article><Check size={21} /><span><strong>{activeStudents}</strong><small>Active students</small></span></article>
          <article><BookOpen size={21} /><span><strong>{courseCount}</strong><small>Course records</small></span></article>
        </section>

        <form className="teacher-toolbar teacher-lookup-form" onSubmit={(event) => void lookup(event)}>
          <label>
            <Search size={17} />
            <input
              aria-label="Student email or user ID"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Student email or Supabase user ID"
              type="text"
              value={query}
            />
          </label>
          <button className="button primary" disabled={loading || !query.trim()} type="submit">
            <Search size={16} /> {loading ? "Searching…" : "Find student"}
          </button>
        </form>

        {error ? (
          <div className="teacher-error" role="alert">
            <p>{error}</p>
          </div>
        ) : !lastQuery ? (
          <div className="teacher-empty teacher-lookup-empty">
            <Search size={30} />
            <h2>Enter a student identifier</h2>
            <p>No student data is loaded until you submit an exact email address or Supabase user ID.</p>
          </div>
        ) : loading ? (
          <p className="teacher-loading" role="status">Searching for {lastQuery}…</p>
        ) : students.length ? (
          <section className="teacher-student-list" aria-label="Students">
            {students.map((student) => <StudentCard key={student.userId} student={student} />)}
          </section>
        ) : (
          <div className="teacher-empty">
            <Users size={30} />
            <h2>No matching student found</h2>
            <p>Check that the full email address or Supabase user ID is correct.</p>
          </div>
        )}
      </main>
    </div>
  );
}

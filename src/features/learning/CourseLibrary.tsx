import { BookOpen, Plus } from "lucide-react";
import type { LibraryEntry } from "../../lib/course-library";
import "./course-library.css";

type Props = {
  entries: LibraryEntry[] | null;
  error: string;
  busy: boolean;
  onUpload: () => void;
  onReload: () => void;
  onOpen: (course: LibraryEntry) => void;
  onDelete: (course: LibraryEntry) => void;
  renderDownload: (path: string, name: string) => React.ReactNode;
};

export default function CourseLibrary({ entries, error, busy, onUpload, onReload, onOpen, onDelete, renderDownload }: Props) {
  return (
    <section className="course-library">
      <header className="panel course-library-header">
        <div>
          <h1>My course library</h1>
          <p>Save course files, generate study kits, and resume each course where you left off.</p>
        </div>
        <button className="button primary" disabled={busy} onClick={onUpload} type="button">
          <Plus size={17} /> Add course
        </button>
      </header>
      {error ? (
        <div className="page-error" role="alert">
          <p>{error}</p>
          <button className="text-button" disabled={busy} onClick={onReload} type="button">Reload library</button>
        </div>
      ) : null}
      {!entries && !error ? <p role="status">Loading your library…</p> : null}
      {entries?.length === 0 ? <p className="panel course-library-empty">No saved courses yet. Add a PDF or PPTX to get started.</p> : null}
      <ul className="course-library-list">
        {entries?.map((course) => (
          <li className="panel course-library-entry" key={course.id}>
            <div className="course-library-title">
              <BookOpen size={20} aria-hidden="true" />
              <div>
                <h2>{course.name}</h2>
                <p>
                  <time dateTime={course.created_at}>{new Date(course.created_at).toLocaleDateString()}</time>
                  {" · "}<span>{course.has_pack ? "Study kit ready" : "File saved"}</span>
                </p>
              </div>
            </div>
            <div className="course-library-actions">
              <button className="button primary" disabled={busy} onClick={() => onOpen(course)} type="button">
                {course.has_pack ? "Resume learning" : "Review and generate"}
              </button>
              {course.file_path ? renderDownload(course.file_path, course.name) : null}
              <button className="text-button" disabled={busy} onClick={() => onDelete(course)} type="button">Delete course</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

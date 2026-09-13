import styles from './MessageState.module.css';

type MessageStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
};

export function MessageState({
  title,
  description,
  actionLabel,
  onAction,
  busy = false,
}: MessageStateProps) {
  return (
    <section className={styles.state} aria-live="polite" aria-busy={busy}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        {actionLabel && onAction ? (
          <button className={styles.action} type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}


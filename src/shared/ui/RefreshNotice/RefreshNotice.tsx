import styles from './RefreshNotice.module.css';

type RefreshNoticeProps = {
  description: string;
  busy: boolean;
  onRetry: () => void;
};

export function RefreshNotice({
  description,
  busy,
  onRetry,
}: RefreshNoticeProps) {
  return (
    <div className={styles.notice} role="status">
      <p>Не удалось обновить данные. {description}</p>
      <button type="button" disabled={busy} onClick={onRetry}>
        {busy ? 'Повторяем запрос…' : 'Повторить запрос'}
      </button>
    </div>
  );
}

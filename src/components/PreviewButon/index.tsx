import Link from 'next/link';
import styles from './styles.module.scss';

interface PreviewButtonProps {
  preview: boolean;
}

export function PreviewButton({ preview }: PreviewButtonProps): JSX.Element {
  return !preview ? (
    <aside>
      <Link href="/api/preview">
        <a className={styles.previewButton}>Entrar do modo Preview</a>
      </Link>
    </aside>
  ) : (
    <aside>
      <Link href="/api/exit-preview">
        <a className={styles.previewButton}>Sair do modo Preview</a>
      </Link>
    </aside>
  );
}

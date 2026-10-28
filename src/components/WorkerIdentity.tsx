import type { PropsWithChildren } from 'react';

interface WorkerIdentityProps extends PropsWithChildren {
  name: string;
  nameTag?: 'h2' | 'h3' | 'strong';
  className?: string;
}

export default function WorkerIdentity({ name, nameTag = 'strong', className = '', children }: WorkerIdentityProps) {
  const NameTag = nameTag;

  return (
    <div className={`worker-identity ${className}`.trim()}>
      <div className="worker-avatar" aria-hidden="true">{name.trim().charAt(0).toLocaleUpperCase()}</div>
      <div className="worker-identity-details">
        <NameTag className="worker-identity-name">{name}</NameTag>
        {children}
      </div>
    </div>
  );
}
import * as React from "react";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="text-center py-10 px-4">
      {icon && (
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-surface2 flex items-center justify-center text-muted">
          {icon}
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted mt-1.5 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

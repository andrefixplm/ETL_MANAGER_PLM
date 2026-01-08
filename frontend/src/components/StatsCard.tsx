interface StatsCardProps {
  icon: string;
  iconColor: string;
  bgColor: string;
  value: number | string;
  label: string;
  badge?: {
    text: string;
    color: 'green' | 'red' | 'yellow';
  };
}

export function StatsCard({ icon, iconColor, bgColor, value, label, badge }: StatsCardProps) {
  const badgeColors = {
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 ${bgColor} rounded-lg`}>
          <span className={`material-icons-outlined ${iconColor}`}>{icon}</span>
        </div>
        {badge && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColors[badge.color]}`}>
            {badge.text}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-text-light dark:text-white">
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </h3>
      <p className="text-xs text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide font-medium mt-1">
        {label}
      </p>
    </div>
  );
}

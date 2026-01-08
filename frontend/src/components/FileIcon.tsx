interface FileIconProps {
  filename: string;
  className?: string;
}

export function FileIcon({ filename, className = '' }: FileIconProps) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const iconMap: Record<string, { icon: string; color: string }> = {
    pdf: { icon: 'picture_as_pdf', color: 'text-red-500' },
    prt: { icon: 'view_in_ar', color: 'text-blue-500' },
    asm: { icon: 'account_tree', color: 'text-purple-500' },
    drw: { icon: 'draw', color: 'text-green-500' },
    doc: { icon: 'description', color: 'text-blue-600' },
    docx: { icon: 'description', color: 'text-blue-600' },
    xls: { icon: 'table_chart', color: 'text-green-600' },
    xlsx: { icon: 'table_chart', color: 'text-green-600' },
    jpg: { icon: 'image', color: 'text-yellow-500' },
    jpeg: { icon: 'image', color: 'text-yellow-500' },
    png: { icon: 'image', color: 'text-yellow-500' },
  };

  const config = iconMap[ext] || { icon: 'description', color: 'text-gray-400' };

  return (
    <span className={`material-icons-outlined ${config.color} ${className}`}>
      {config.icon}
    </span>
  );
}

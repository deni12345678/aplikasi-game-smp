import React from 'react';

interface AvatarBadgeProps {
  photo?: string;
  icon?: string;
  fallbackText?: string;
  color?: string;
  alt: string;
  sizeClass?: string;
  textClass?: string;
  roundedClass?: string;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  photo,
  icon,
  fallbackText = '🎓',
  color = '#047857',
  alt,
  sizeClass = 'h-10 w-10',
  textClass = 'text-xl',
  roundedClass = 'rounded-lg',
}) => {
  if (photo) {
    return (
      <img
        src={photo}
        alt={alt}
        className={`${sizeClass} ${roundedClass} shrink-0 border border-slate-200 object-cover bg-slate-100`}
      />
    );
  }

  return (
    <span
      className={`flex ${sizeClass} ${roundedClass} ${textClass} shrink-0 items-center justify-center font-bold text-white select-none`}
      style={{ backgroundColor: color }}
      aria-label={alt}
    >
      {icon || fallbackText}
    </span>
  );
};

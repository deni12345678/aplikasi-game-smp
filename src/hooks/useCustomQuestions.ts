import { useEffect, useState } from 'react';
import type { CustomQuestion } from '../types';

export function useCustomQuestions() {
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/questions')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.questions)) {
          setCustomQuestions(data.questions as CustomQuestion[]);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return customQuestions;
}

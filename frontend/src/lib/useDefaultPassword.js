import { useState } from 'react';

/** The admin's "default password", remembered in this browser and reused when creating accounts. */
export default function useDefaultPassword() {
  const [pw, setPw] = useState(() => localStorage.getItem('default_pw') ?? 'Welcome@123');
  const update = (v) => {
    setPw(v);
    localStorage.setItem('default_pw', v);
  };
  return [pw, update];
}

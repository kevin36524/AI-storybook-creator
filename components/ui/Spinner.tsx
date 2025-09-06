
import React from 'react';

interface SpinnerProps {
    message: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-16 h-16 border-8 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
      <p className="text-xl font-semibold text-slate-700">{message}</p>
    </div>
  );
};

export default Spinner;

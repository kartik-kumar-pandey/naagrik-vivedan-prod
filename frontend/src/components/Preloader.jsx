import React, { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';

const Preloader = () => {
  const preloaderRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Add preloader-active class to body
    document.body.classList.add('preloader-active');

    if (!preloaderRef.current) return;

    const tl = gsap.timeline();

    // Animate the text first - each letter slides up
    tl.to('.name-text span', {
      y: 0,
      stagger: 0.1,
      duration: 0.3,
    });

    // Then animate the preloader items (bars slide up)
    tl.to('.preloader-item', {
      delay: 1.5,
      y: '100%',
      duration: 0.6,
      stagger: 0.1,
    }, '+=0.5');

    // Hide text
    tl.to('.name-text span', {
      autoAlpha: 0,
      duration: 0.3
    }, '-=0.3');

    // Hide preloader
    tl.to(preloaderRef.current, {
      autoAlpha: 0,
      duration: 0.5,
      onComplete: () => {
        document.body.classList.remove('preloader-active');
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        setIsVisible(false);
      }
    });
  }, []);

  if (!isVisible) {
    return null;
  }

  // Split "Nagarik Nivedan" into individual characters
  const text = "Nagarik Nivedan";
  const letters = text.split('');

  return (
    <div className="fixed inset-0 z-[9999] flex" ref={preloaderRef}>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      <div className="preloader-item h-full w-[10%] bg-black"></div>
      
      <p className="name-text flex text-[15vw] md:text-[12vw] lg:text-[150px] font-bold text-white text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none overflow-hidden whitespace-nowrap">
        {letters.map((letter, index) => (
          <span 
            key={index} 
            className="inline-block translate-y-full"
            style={{ marginRight: letter === ' ' ? '0.3em' : '0' }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </p>
    </div>
  );
};

export default Preloader;


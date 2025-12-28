"use client";

import React from 'react';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import WhyChooseUs from '@/components/landing/WhyChooseUs';
import Testimonials from '@/components/landing/Testimonials';
import CallToAction from '@/components/landing/CallToAction';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Features />
      <WhyChooseUs />
      <Testimonials />
      <CallToAction />
      <Footer />
    </main>
  );
}

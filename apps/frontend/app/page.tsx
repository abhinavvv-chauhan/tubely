'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import Image from 'next/image';

const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const LoadingDots = () => (
    <div className="flex space-x-1 justify-center items-center">
        <span className="sr-only">Loading...</span>
        <div className="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 bg-white rounded-full animate-bounce"></div>
    </div>
);

interface VideoFormat {
    itag: string;
    qualityLabel: string;
    container: string;
}
interface VideoInfo {
    title: string;
    thumbnail: string;
    formats: VideoFormat[];
}

const BACKEND_URL = 'http://localhost:4000';

export default function Home() {
    const [url, setUrl] = useState<string>('');
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'audio' | 'video'>('audio');
    const [preparingDownload, setPreparingDownload] = useState<string | null>(null);
    const bookmarkletRef = useRef<HTMLAnchorElement>(null);
    const resultsRef = useRef<HTMLElement>(null); 

    useEffect(() => {
        const bookmarkletHref = `javascript:void(window.open('${window.location.origin}/?url='+encodeURIComponent(window.location.href)));`;
        if (bookmarkletRef.current) {
            bookmarkletRef.current.setAttribute('href', bookmarkletHref);
        }

        const params = new URLSearchParams(window.location.search);
        const urlFromQuery = params.get('url');
        if (urlFromQuery && !loading && !videoInfo) {
            setUrl(urlFromQuery);
            handleFetchInfo(urlFromQuery);
        }
    }, [loading, videoInfo]);

    useEffect(() => {
        if (!preparingDownload) return;
        const interval = setInterval(() => {
            if (Cookies.get('download-status') === 'starting') {
                setPreparingDownload(null);
                Cookies.remove('download-status', { path: '/' });
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [preparingDownload]);

    useEffect(() => {
        if (videoInfo && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [videoInfo]);


    const handleFetchInfo = async (fetchUrl?: string) => {
        const targetUrl = fetchUrl || url;
        if (!targetUrl.trim() || loading) { return; }
        setLoading(true);
        setError('');
        setVideoInfo(null);
        
        try {
            const response = await axios.get(`${BACKEND_URL}/info`, { params: { url: targetUrl } });
            if (response.data.success) setVideoInfo(response.data);
            else setError(response.data.error);
        } catch (err) {
            setError('Could not connect to the server. Is it running?');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (downloadUrl: string, downloadId: string) => {
        setPreparingDownload(downloadId);
        window.location.href = downloadUrl;
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') handleFetchInfo();
    };
    
    return (
        <div className="flex flex-col min-h-screen font-sans bg-gray-100 bg-grainy">
            <header className="px-4 lg:px-8 py-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto flex items-center">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.svg" alt="Tubely Logo" width={32} height={32} />
                        <span className="font-poppins text-2xl font-bold text-slate-800">Tubely</span>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center p-4 text-center">
                
                <section className="w-full max-w-3xl mt-12 md:mt-20">
                    <div className="bg-white shadow-2xl rounded-2xl p-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-800">
                            YouTube Video Downloader
                        </h1>
                        <p className="text-slate-500 mt-4 text-lg">
                            Tubely allows you to convert & download video from YouTube to Mp3, Mp4 in HD quality.
                        </p>
                        <div className="flex justify-center w-full mt-8 rounded-xl">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full p-4 border-2 border-r-0 border-gray-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                            <button 
                                onClick={() => handleFetchInfo()} 
                                disabled={loading} 
                                className="px-8 py-4 bg-pink-500 text-white font-semibold rounded-r-xl hover:bg-pink-600 disabled:bg-slate-400 w-32 flex justify-center items-center"
                            >
                                {loading ? <LoadingDots /> : 'Start'}
                            </button>
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="font-semibold text-gray-800">For Faster Downloads!</h3>
                            <p className="text-sm text-gray-600 mt-1">Drag this button to your bookmarks bar. Then, click it on any YouTube page to start your download instantly.</p>
                            <a 
                                ref={bookmarkletRef}
                                onClick={(e) => e.preventDefault()}
                                className="inline-block mt-3 px-4 py-2 bg-gray-600 text-white font-bold rounded-md shadow-md hover:bg-gray-900 transition-colors cursor-move"
                                title="Drag me to your bookmarks bar!"
                            >
                                Download with Tubely
                            </a>
                        </div>
                    </div>
                </section>
                
                {!videoInfo && !loading && (
                    <section className="w-full max-w-6xl mt-12 text-left">
                        

                        <div className="grid md:grid-cols-3 mt-10 gap-8 mb-12">
                            <div className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800">∞</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-pink-600 mb-3">Free Unlimited Conversion</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Download YouTube videos for free using Tubely and users can download unlimited YouTube videos. Enjoy the freedom to download as many videos as you want.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-pink-600 mb-3">Easy and User-Friendly Interface</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Tubely features an attractive and easy-to-use interface that simplifies the process of downloading videos from YouTube. Simply copy and paste the YouTube video URL into the designated field to begin your download.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex items-center justify-center">
                                        <span className="text-lg font-bold text-gray-800">8K</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-pink-600 mb-3">High-Quality Downloads</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Our Tubely platform supports multiple high-quality downloads, ensuring that users receive the same quality as YouTube. You can download YouTube videos in 720p, 1080p, and even up to 8K resolution.
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mb-12">
                            <div className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-pink-600 mb-3">Very Fast Download</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Tubely is the fastest downloader that quickly converts and downloads videos, so you don't have to wait long for your video download and without sacrificing quality.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-pink-600 mb-3">No Software Installation</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Tubely operates entirely online, allowing you to use the service directly in your web browser without the need to install any software. Enjoy the convenience of downloading videos without the hassle of registration or log-ins.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-pink-600 mb-3">Compatible with all devices</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Tubely is a web-based YouTube downloader that works seamlessly on all devices, including smartphones, computers, and tablets. It also works seamlessly with all popular browsers such as Chrome, Firefox, Safari, Microsoft Edge, and Opera.
                                </p>
                            </div>
                        </div>
                    </section>
                )}
                
                {error && <p className="text-red-500 font-semibold mt-6">{error}</p>}

                {videoInfo && (
                    <section ref={resultsRef} className="mt-12 w-full max-w-4xl p-6 bg-white shadow-xl rounded-2xl mb-12">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-full md:w-1/3">
                                <img src={videoInfo.thumbnail} alt={videoInfo.title} className="w-full rounded-lg shadow-md" />
                                <h2 className="text-lg font-semibold text-slate-700 mt-2 text-left">{videoInfo.title}</h2>
                            </div>
                            <div className="w-full md:w-2/3">
                                <div className="flex">
                                    <button onClick={() => setActiveTab('audio')} className={`px-4 py-2 font-semibold cursor-pointer ${activeTab === 'audio' ? 'border-b-2 border-gray-500 bg-gray-200 rounded-xl text-gray-900' : 'text-slate-500'}`}>
                                        Audio
                                    </button>
                                    <button onClick={() => setActiveTab('video')} className={`px-4 py-2 font-semibold cursor-pointer ${activeTab === 'video' ? 'border-b-2 border-gray-500 bg-gray-200 rounded-xl text-gray-900' : 'text-slate-500'}`}>
                                        Video
                                    </button>
                                </div>
                                <table className="w-full text-left mt-4 border border-slate-300 border-collapse">
                                    <thead>
                                        <tr className="text-sm text-slate-600 bg-slate-50">
                                            <th className="p-2 border border-slate-300">File type</th>
                                            <th className="p-2 border border-slate-300">Format</th>
                                            <th className="p-2 border border-slate-300">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeTab === 'audio' && (
                                            <>
                                                <tr className="border border-slate-300">
                                                    <td className="p-2 border border-slate-300">MP3 - 320kbps</td>
                                                    <td className="p-2 border border-slate-300">Audio</td>
                                                    <td className="p-2 border border-slate-300">
                                                        <button
                                                            disabled={!!preparingDownload}
                                                            onClick={() => handleDownload(`${BACKEND_URL}/download-mp3-hq?url=${encodeURIComponent(url)}&title=${encodeURIComponent(videoInfo.title)}`, 'mp3-hq')}
                                                            className="inline-flex cursor-pointer items-center justify-center px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 text-sm disabled:bg-slate-400 w-32 text-center"
                                                        >
                                                            {preparingDownload === 'mp3-hq' ? <><Spinner /> Preparing...</> : 'Download'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                <tr className="border border-slate-300">
                                                    <td className="p-2 border border-slate-300">MP3 - 128kbps</td>
                                                    <td className="p-2 border border-slate-300">Audio</td>
                                                    <td className="p-2 border border-slate-300">
                                                        <button
                                                            disabled={!!preparingDownload}
                                                            onClick={() => handleDownload(`${BACKEND_URL}/download-mp3?url=${encodeURIComponent(url)}&title=${encodeURIComponent(videoInfo.title)}`, 'mp3-lq')}
                                                            className="inline-flex cursor-pointer items-center justify-center px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 text-sm disabled:bg-slate-400 w-32 text-center"
                                                        >
                                                            {preparingDownload === 'mp3-lq' ? <><Spinner /> Preparing...</> : 'Download'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                        {activeTab === 'video' && videoInfo.formats.map(format => (
                                            <tr key={format.itag} className="border border-slate-300">
                                                <td className="p-2 border border-slate-300">Video - {format.qualityLabel}</td>
                                                <td className="p-2 border border-slate-300">{format.container.toUpperCase()}</td>
                                                <td className="p-2 border border-slate-300">
                                                    <button
                                                        disabled={!!preparingDownload}
                                                        onClick={() => handleDownload(`${BACKEND_URL}/download-mp4?url=${encodeURIComponent(url)}&itag=${format.itag}&title=${encodeURIComponent(videoInfo.title)}`, `video-${format.itag}`)}
                                                        className="inline-flex items-center justify-center cursor-pointer px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 text-sm disabled:bg-slate-400 w-32 text-center"
                                                    >
                                                        {preparingDownload === `video-${format.itag}` ? <><Spinner /> Preparing...</> : 'Download'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface InviteDetails {
    group_name: string;
    member_count: number;
    group_id: number;
    created_by: string;
}

export default function InvitePage() {
    const { token } = useParams();
    const [details, setDetails] = useState<InviteDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchInvite() {
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://api.digitalhisaab.me";
                const res = await fetch(`${apiBase}/api/v1/invites/${token}`);
                if (!res.ok) throw new Error("Invalid or expired invite link");
                const data = await res.json();
                setDetails(data);

                // Auto-redirect attempt for mobile
                const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (isMobile) {
                    const scheme = process.env.NEXT_PUBLIC_MOBILE_APP_SCHEME || "hisaab";
                    setTimeout(() => {
                        window.location.href = `${scheme}://invite/${token}`;
                    }, 1000);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (token) fetchInvite();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <div className="glass-card p-8 max-w-md w-full">
                    <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center text-error mx-auto mb-4 text-3xl">
                        ⚠️
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Oops!</h1>
                    <p className="text-text-secondary mb-8">{error}</p>
                    <Link href="/" className="btn-primary inline-block w-full text-center">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block">
                        <div className="flex items-center gap-3 justify-center mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                <Image src="/logo.png" alt="Hisaab" width={24} height={24} />
                            </div>
                            <span className="text-2xl font-bold gradient-text">hisaab</span>
                        </div>
                    </Link>
                </div>

                <div className="glass-card p-8 text-center glow border-primary/30">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>

                    <p className="text-text-muted mb-2 uppercase tracking-widest text-xs font-bold">Group Invitation</p>
                    <h1 className="text-3xl font-bold mb-2">Join Group</h1>
                    <p className="text-text-secondary mb-6">
                        <span className="text-text-primary font-semibold">{details?.created_by}</span> invited you to join
                    </p>

                    <div className="bg-background-dark/50 rounded-2xl p-6 mb-8 border border-glass-border">
                        <h2 className="text-2xl font-bold text-primary mb-1">{details?.group_name}</h2>
                        <p className="text-text-muted text-sm">{details?.member_count} {details?.member_count === 1 ? 'member' : 'members'}</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => {
                                const scheme = process.env.NEXT_PUBLIC_MOBILE_APP_SCHEME || "hisaab";
                                window.location.href = `${scheme}://invite/${token}`;
                            }}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            Open in Hisaab App
                        </button>

                        <div className="pt-4 border-t border-glass-border">
                            <p className="text-sm text-text-muted mb-4">Don&apos;t have the app yet?</p>
                            <div className="flex flex-col gap-3">
                                <Link
                                    href={process.env.NEXT_PUBLIC_ANDROID_APK_URL || "/hisaab.apk"}
                                    download
                                    className="btn-secondary flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 3.68l5.7 6.62 5.71-6.62H3zm14.58 0l-5.71 6.62h11.42L17.58 3.68zM6.29 11.55l-2.58 8.76 5.7-6.62-3.12-2.14zm14.58 2.14l-3.12 2.14 5.7 6.62-2.58-8.76zM12 13.83L6.29 11.55 12 21l5.71-9.45L12 13.83z" />
                                    </svg>
                                    Get the Android App
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-text-muted text-sm mt-8">
                    Split today. Settle tomorrow. &bull; Hisaab
                </p>
            </div>
        </div>
    );
}

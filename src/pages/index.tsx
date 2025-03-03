import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { NextPage } from 'next';
import { TextureLoader } from 'three';

type FrameStyle = 'square' | 'glow' | 'cloud' | 'squareGlow' | 'glowEdge';
type MediaType = 'image' | 'video';

interface VideoConfig {
    startTime: number;
    endTime: number;
    duration: number;
}

interface PhotoCardProps {
    position: [number, number, number];
    mediaUrl: string;
    mediaType: MediaType;
    username: string;
    caption: string;
    frameStyle: FrameStyle;
    isRotating: boolean;
    frameColor: string;
    videoConfig?: VideoConfig;
}

const VideoTextureLoader = (url: string, config?: VideoConfig): [THREE.VideoTexture | null, HTMLVideoElement | null] => {
    // Create video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    // Set source
    video.src = url;

    // Apply video configuration if provided
    if (config) {
        // Set start and end times
        video.addEventListener('loadedmetadata', () => {
            // If video is longer than max duration (10 seconds), set the appropriate times
            if (video.duration > config.duration) {
                const actualEndTime = Math.min(config.endTime, config.startTime + config.duration);

                // Set the current time to the start time when playing
                video.addEventListener('play', () => {
                    video.currentTime = config.startTime;
                });

                // Check if we need to loop back to start time
                video.addEventListener('timeupdate', () => {
                    if (video.currentTime >= actualEndTime) {
                        video.currentTime = config.startTime;
                    }
                });
            }

            // Start playing
            video.play().catch(e => console.error('Video play error:', e));
        });
    } else {
        // Just play the video from the beginning with a 10 second limit
        video.addEventListener('loadedmetadata', () => {
            // If video is longer than 10 seconds, set up looping for first 10 seconds
            if (video.duration > 10) {
                video.addEventListener('timeupdate', () => {
                    if (video.currentTime > 10) {
                        video.currentTime = 0;
                    }
                });
            }

            // Start playing
            video.play().catch(e => console.error('Video play error:', e));
        });
    }

    // Create video texture
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return [texture, video];
};

const PhotoCard: React.FC<PhotoCardProps> = ({
                                                 position,
                                                 mediaUrl,
                                                 mediaType,
                                                 username,
                                                 caption,
                                                 frameStyle,
                                                 isRotating,
                                                 frameColor,
                                                 videoConfig,
                                             }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

    useEffect(() => {
        console.log('useEffect 호출됨, mediaUrl:', mediaUrl, 'mediaType:', mediaType);
        if (!mediaUrl) {
            console.log('mediaUrl이 비어있음');
            return;
        }

        if (mediaType === 'video') {
            const [newVideoTexture, newVideoElement] = VideoTextureLoader(mediaUrl, videoConfig);
            setVideoTexture(newVideoTexture);
            setVideoElement(newVideoElement);

            if (meshRef.current && newVideoTexture) {
                const material = meshRef.current.material as THREE.MeshStandardMaterial;
                material.map = newVideoTexture;
                material.needsUpdate = true;
                console.log('비디오 텍스처 적용 완료');
            }
        } else {
            console.log('일반 이미지 처리 시작');
            const texture = new TextureLoader().load(mediaUrl);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            if (meshRef.current) {
                const material = meshRef.current.material as THREE.MeshStandardMaterial;
                material.map = texture;
                material.needsUpdate = true;
                console.log('일반 이미지 텍스처 적용 완료');
            }
        }

        // 클린업: 텍스처 메모리 해제
        return () => {
            if (videoTexture) {
                videoTexture.dispose();
            }
            if (videoElement) {
                videoElement.pause();
                videoElement.src = '';
                videoElement.load();
            }
        };
    }, [mediaUrl, mediaType, videoConfig]);

    useFrame((state) => {
        if (groupRef.current) {
            if (isRotating) {
                groupRef.current.rotation.y += 0.002;
                groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.05;
            }
            if (hovered) {
                groupRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), 0.1);
            } else {
                groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            }
        }
    });

    const frameGeometries = {
        square: <boxGeometry args={[3.8, 4.8, 0.4]} />,
        glow: <boxGeometry args={[3.8, 4.8, 0.4]} />,
        cloud: <sphereGeometry args={[3.5, 32, 32]} />,
        squareGlow: <boxGeometry args={[4, 5, 0.4]} />,
        glowEdge: <boxGeometry args={[4.2, 5.2, 0.2]} />,
    };

    const frameMaterials = {
        square: (
            <meshPhysicalMaterial
                color={frameColor}
                roughness={0.2}
                metalness={0.8}
                clearcoat={1}
                clearcoatRoughness={0.1}
                transparent
                opacity={0.2}
                envMapIntensity={2}
            />
        ),
        glow: (
            <meshPhysicalMaterial
                color={frameColor}
                roughness={0.3}
                metalness={0.7}
                emissive={frameColor}
                emissiveIntensity={0.3}
                transparent
                opacity={0.2}
                envMapIntensity={2}
            />
        ),
        cloud: (
            <meshPhysicalMaterial
                color={frameColor}
                roughness={0.1}
                metalness={0.9}
                clearcoat={1}
                clearcoatRoughness={0}
                transparent
                opacity={0.2}
                envMapIntensity={2.5}
            />
        ),
        squareGlow: (
            <meshPhysicalMaterial
                color={frameColor}
                roughness={0.2}
                metalness={0.8}
                emissive={frameColor}
                emissiveIntensity={0.4}
                transparent
                opacity={0.2}
                envMapIntensity={2}
            />
        ),
        glowEdge: (
            <meshPhysicalMaterial
                color={frameColor}
                roughness={0.3}
                metalness={0.7}
                emissive={frameColor}
                emissiveIntensity={0.5}
                transparent
                opacity={0.15}
                envMapIntensity={2}
            />
        ),
    };

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            <mesh castShadow receiveShadow>
                {frameGeometries[frameStyle]}
                {frameMaterials[frameStyle]}
            </mesh>
            <mesh ref={meshRef} position={[0, 0, 0.05]} castShadow receiveShadow>
                <boxGeometry args={[3.2, 4.2, 0.05]} />
                <meshStandardMaterial roughness={0.3} metalness={0.2} />
            </mesh>
            <Html position={[1.4, -2, 0.2]} transform>
                <div style={{ textAlign: 'right', color: '#fff', textShadow: '0 0 5px rgba(0,0,0,0.5)' }}>
                    <p style={{ margin: '0', fontWeight: 'bold', fontSize: '0.3rem' }}>@{username}</p>
                </div>
            </Html>
            <Html position={[0, -2.8, 0.2]} transform>
                <div style={{ textAlign: 'center', color: '#fff', textShadow: '0 0 5px rgba(0,0,0,0.5)' }}>
                    <p style={{ margin: '0', fontSize: '0.25rem' }}>{caption}</p>
                </div>
            </Html>
            {mediaType === 'video' && (
                <Html position={[-1.4, -2, 0.2]} transform>
                    <div style={{ textAlign: 'left', color: '#fff', textShadow: '0 0 5px rgba(0,0,0,0.5)' }}>
                        <p style={{ margin: '0', fontSize: '0.25rem' }}>📹</p>
                    </div>
                </Html>
            )}
            {hovered && (
                <Html position={[1.4, 2, 0.2]} transform>
                    <span style={{ fontSize: '0.5rem', color: frameColor }}>✨</span>
                </Html>
            )}
        </group>
    );
};

const PhotoCardPage: NextPage = () => {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<MediaType>('image');
    const [username, setUsername] = useState('YourName');
    const [caption, setCaption] = useState('Capture the moment!');
    const [frameStyle, setFrameStyle] = useState<FrameStyle>('square');
    const [isRotating, setIsRotating] = useState(true);
    const [frameColor, setFrameColor] = useState('#ffd700');
    const [showVideoConfig, setShowVideoConfig] = useState(false);
    const [videoStartTime, setVideoStartTime] = useState(0);
    const [videoEndTime, setVideoEndTime] = useState(10);
    const [videoDuration, setVideoDuration] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            console.log('파일 업로드됨, URL:', url, '파일 이름:', file.name, '파일 타입:', file.type);

            // 비디오 또는 이미지 타입 확인
            const isVideo = file.type.startsWith('video/');
            setMediaType(isVideo ? 'video' : 'image');
            setMediaUrl(url);

            // 비디오일 경우 메타데이터 로드
            if (isVideo) {
                const tempVideo = document.createElement('video');
                tempVideo.src = url;
                tempVideo.onloadedmetadata = () => {
                    setVideoDuration(tempVideo.duration);
                    setVideoEndTime(Math.min(10, tempVideo.duration));
                    setShowVideoConfig(tempVideo.duration > 10);
                };
            } else {
                setShowVideoConfig(false);
            }
        } else {
            console.log('파일 선택되지 않음');
        }
    };

    // 비디오 설정 객체
    const videoConfig: VideoConfig | undefined = mediaType === 'video' ? {
        startTime: videoStartTime,
        endTime: videoEndTime,
        duration: 10, // 최대 10초로 제한
    } : undefined;

    // 시간 포맷팅 함수
    const formatTime = (time: number): string => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.floor((time % 1) * 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'row',
                background: 'linear-gradient(135deg, #fff0f5, #e6e6fa)',
                fontFamily: "'Helvetica Neue', sans-serif",
            }}
        >
            <div style={{ flex: 1, position: 'relative' }}>
                <Canvas shadows camera={{ position: [0, 0, 10], fov: 60 }}>
                    <ambientLight intensity={0.7} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
                    <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                    {mediaUrl ? (
                        <PhotoCard
                            position={[0, 0, 0]}
                            mediaUrl={mediaUrl}
                            mediaType={mediaType}
                            username={username}
                            caption={caption}
                            frameStyle={frameStyle}
                            isRotating={isRotating}
                            frameColor={frameColor}
                            videoConfig={videoConfig}
                        />
                    ) : (
                        <Html center>
                            <div
                                style={{
                                    padding: '20px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    borderRadius: '15px',
                                    textAlign: 'center',
                                    boxShadow: '0 0 20px rgba(255, 182, 193, 0.5)',
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '1.5rem', color: '#ff69b4' }}>
                                    Upload an image or video to create your 3D PhotoCard!
                                </p>
                            </div>
                        </Html>
                    )}
                </Canvas>
            </div>
            <div
                style={{
                    width: '350px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '20px',
                    boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    overflowY: 'auto',
                }}
            >
                <h1
                    style={{
                        fontSize: '2rem',
                        margin: 0,
                        color: '#ff69b4',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        textShadow: '0 0 10px rgba(255, 105, 180, 0.5)',
                    }}
                >
                    3D PhotoCard
                </h1>
                <div>
                    <input
                        type="file"
                        accept="image/*,video/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleMediaUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'linear-gradient(45deg, #ff69b4, #ffd700)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '25px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 5px 15px rgba(255, 105, 180, 0.4)',
                            transition: 'transform 0.2s ease',
                        }}
                        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        Upload Photo or Video
                    </button>
                </div>

                {/* 비디오 설정 (10초 이상 비디오일 경우만 표시) */}
                {showVideoConfig && mediaType === 'video' && videoDuration > 0 && (
                    <div style={{ border: '1px solid #ffb6c1', borderRadius: '10px', padding: '15px' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#ff69b4' }}>Video Trimming</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 10px 0' }}>
                            Your video is longer than 10 seconds. Select a 10-second clip to use.
                        </p>

                        {/* 비디오 미리보기 */}
                        {mediaUrl && (
                            <video
                                ref={videoRef}
                                src={mediaUrl}
                                style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }}
                                controls
                                muted
                            />
                        )}

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#ff69b4', fontWeight: '500' }}>
                                Start Time: {formatTime(videoStartTime)}
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={Math.max(0, videoDuration - 1)}
                                step={0.1}
                                value={videoStartTime}
                                onChange={(e) => {
                                    const newStart = parseFloat(e.target.value);
                                    setVideoStartTime(newStart);
                                    if (newStart + 10 > videoDuration) {
                                        setVideoEndTime(videoDuration);
                                    } else if (videoEndTime < newStart + 10) {
                                        setVideoEndTime(newStart + 10);
                                    }
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = newStart;
                                    }
                                }}
                                style={{ width: '100%', accentColor: '#ff69b4' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#ff69b4', fontWeight: '500' }}>
                                End Time: {formatTime(videoEndTime)} (Max 10 seconds: {formatTime(videoStartTime + 10)})
                            </label>
                            <input
                                type="range"
                                min={videoStartTime + 1}
                                max={Math.min(videoDuration, videoStartTime + 10)}
                                step={0.1}
                                value={videoEndTime}
                                onChange={(e) => {
                                    const newEnd = parseFloat(e.target.value);
                                    setVideoEndTime(newEnd);
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = newEnd;
                                    }
                                }}
                                style={{ width: '100%', accentColor: '#ff69b4' }}
                            />
                        </div>

                        <button
                            onClick={() => {
                                if (videoRef.current) {
                                    videoRef.current.currentTime = videoStartTime;
                                    videoRef.current.play().catch(e => console.error('Video play error:', e));
                                    setTimeout(() => {
                                        if (videoRef.current) {
                                            videoRef.current.pause();
                                        }
                                    }, (videoEndTime - videoStartTime) * 1000);
                                }
                            }}
                            style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '8px',
                                background: '#fff0f5',
                                color: '#ff69b4',
                                border: '1px solid #ffb6c1',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                            }}
                        >
                            Preview Clip
                        </button>
                    </div>
                )}

                <div>
                    <label
                        htmlFor="username"
                        style={{ display: 'block', marginBottom: '5px', color: '#ff69b4', fontWeight: '500' }}
                    >
                        Username
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #ffb6c1',
                            fontSize: '1rem',
                            color: '#ff69b4',
                            outline: 'none',
                        }}
                    />
                </div>
                <div>
                    <label
                        htmlFor="caption"
                        style={{ display: 'block', marginBottom: '5px', color: '#ff69b4', fontWeight: '500' }}
                    >
                        Caption
                    </label>
                    <textarea
                        id="caption"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #ffb6c1',
                            fontSize: '1rem',
                            color: '#ff69b4',
                            resize: 'none',
                            height: '80px',
                            outline: 'none',
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#ff69b4', fontWeight: '500' }}>
                        Frame Style
                    </label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {(['square', 'glow', 'cloud', 'squareGlow', 'glowEdge'] as FrameStyle[]).map((style) => (
                            <button
                                key={style}
                                onClick={() => setFrameStyle(style)}
                                style={{
                                    flex: '1 1 45%',
                                    padding: '8px',
                                    background: frameStyle === style ? 'linear-gradient(45deg, #ff69b4, #ffd700)' : '#fff0f5',
                                    color: frameStyle === style ? '#fff' : '#ff69b4',
                                    border: `1px solid ${frameStyle === style ? '#ffd700' : '#ffb6c1'}`,
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label
                        htmlFor="frameColor"
                        style={{ display: 'block', marginBottom: '5px', color: '#ff69b4', fontWeight: '500' }}
                    >
                        Color
                    </label>
                    <input
                        id="frameColor"
                        type="color"
                        value={frameColor}
                        onChange={(e) => setFrameColor(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '8px',
                            border: '1px solid #ffb6c1',
                            cursor: 'pointer',
                        }}
                    />
                </div>
                <button
                    onClick={() => setIsRotating(!isRotating)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: isRotating ? '#fff0f5' : 'linear-gradient(45deg, #ff69b4, #ffd700)',
                        color: isRotating ? '#ff69b4' : '#fff',
                        border: '1px solid #ffb6c1',
                        borderRadius: '25px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {isRotating ? 'Stop Rotation' : 'Start Rotation'}
                </button>
                <button
                    onClick={() => {
                        setMediaUrl(null);
                        setMediaType('image');
                        setUsername('YourName');
                        setCaption('Capture the moment!');
                        setFrameStyle('square');
                        setIsRotating(true);
                        setFrameColor('#ffd700');
                        setShowVideoConfig(false);
                        setVideoStartTime(0);
                        setVideoEndTime(10);
                        setVideoDuration(0);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: '#fff0f5',
                        color: '#ff69b4',
                        border: '1px solid #ffb6c1',
                        borderRadius: '25px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#ffb6c1')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#fff0f5')}
                    onMouseDown={(e) => (e.currentTarget.style.color = '#fff')}
                    onMouseUp={(e) => (e.currentTarget.style.color = '#ff69b4')}
                >
                    Reset
                </button>
                <div style={{ marginTop: 'auto', textAlign: 'center', color: '#ff69b4', fontSize: '0.9rem' }}>
                    Made with ✨ using React & Three.js
                </div>
            </div>
        </div>
    );
};

export default PhotoCardPage;
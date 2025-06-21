"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMUtils, VRMLoaderPlugin } from "@pixiv/three-vrm";
import * as Kalidokit from "kalidokit";
import { useToast } from "@/hooks/use-toast";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import holisticWasm from "@mediapipe/holistic/holistic.binary.wasm";

interface ThreeCanvasProps {
  vrmUrl: string | null;
  isCameraEnabled: boolean;
}

const ThreeCanvas = ({ vrmUrl, isCameraEnabled }: ThreeCanvasProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentVrm = useRef<VRM | null>(null);
  const { toast } = useToast();
  const [isHolisticLoaded, setIsHolisticLoaded] = useState(false);

  useEffect(() => {
    const scriptId = "mediapipe-holistic-script";
    if (document.getElementById(scriptId)) {
      setIsHolisticLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/holistic.js";
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => setIsHolisticLoaded(true);
    script.onerror = () => {
      toast({
        title: "Script Error",
        description: "Failed to load MediaPipe script. Motion tracking will not work.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);

  }, [toast]);


  useEffect(() => {
    if (!isCameraEnabled || !videoRef.current || !isHolisticLoaded) return;

    const videoElement = videoRef.current;
    let holistic: any;
    let holisticFrameId: number;

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        videoElement.srcObject = stream;
        await videoElement.play();
      } catch (error) {
        console.error("Failed to get user media", error);
        toast({
            title: "Camera Error",
            description: "Could not access camera. Please check permissions.",
            variant: "destructive",
        });
      }
    };

    const onResults = (results: any) => {
      if (!currentVrm.current) return;

      let riggedPose, riggedFace;

      try {
        if (results.poseLandmarks) {
          riggedPose = Kalidokit.Pose.solve(results.poseLandmarks, { runtime: "mediapipe", video: videoElement });
        }
        if (results.faceLandmarks) {
          riggedFace = Kalidokit.Face.solve(results.faceLandmarks, { runtime: "mediapipe", video: videoElement });
        }
      } catch (error) {
        // Errors can happen when MediaPipe loses track of the user.
        // We can safely ignore these errors and wait for the next frame.
        return;
      }


      if (riggedPose && currentVrm.current.humanoid) {
        currentVrm.current.humanoid.setPose(riggedPose);
      }
      if (riggedFace && currentVrm.current.expressionManager && currentVrm.current.lookAt) {
        currentVrm.current.expressionManager.setValue("mouthOpen", riggedFace.mouth.y);
        currentVrm.current.expressionManager.setValue("mouthSmile", riggedFace.mouth.x);
        
        const lookAtTarget = new THREE.Vector3().copy(currentVrm.current.scene.position);
        lookAtTarget.y += 1.6; // head height
        lookAtTarget.z += 5; // look forward
        lookAtTarget.x += riggedFace.look.x * 2;
        lookAtTarget.y += riggedFace.look.y * 2;
        
        currentVrm.current.lookAt.target.position.copy(lookAtTarget);
      }
    };
    
    setupCamera();

    const HolisticConstructor = (window as any).Holistic?.default || (window as any).Holistic;
    
    if (!HolisticConstructor || typeof HolisticConstructor !== 'function') {
      toast({
        title: "Initialization Error",
        description: "MediaPipe Holistic not ready. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    holistic = new HolisticConstructor({
        locateFile: (file: string) => {
          if (file.endsWith('.wasm')) {
            return holisticWasm;
          }
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`
        },
    });
    
    holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        refineFaceLandmarks: true,
    });
    
    holistic.onResults(onResults);
    
    const sendToHolistic = async () => {
        if (videoElement.readyState >= 2) {
            await holistic.send({ image: videoElement });
        }
        holisticFrameId = requestAnimationFrame(sendToHolistic);
    };

    const loadedDataHandler = () => {
        sendToHolistic();
    };
    videoElement.addEventListener("loadeddata", loadedDataHandler);

    return () => {
      cancelAnimationFrame(holisticFrameId);
      holistic?.close();
      const stream = videoElement.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      videoElement.removeEventListener("loadeddata", loadedDataHandler);
    };
  }, [isCameraEnabled, toast, isHolisticLoaded]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30.0, mount.clientWidth / mount.clientHeight, 0.1, 20.0);
    camera.position.set(0.0, 1.4, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.0, 0.0);
    controls.update();

    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const clock = new THREE.Clock();
    let animationFrameId: number;

    if (vrmUrl) {
      loader.load(
        vrmUrl,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          if (currentVrm.current) {
            scene.remove(currentVrm.current.scene);
            VRMUtils.deepDispose(currentVrm.current.scene);
          }
          scene.add(vrm.scene);
          vrm.scene.rotation.y = Math.PI; // Rotate model to face camera
          currentVrm.current = vrm;
          
          vrm.lookAt.target = new THREE.Object3D();
          vrm.scene.add(vrm.lookAt.target);
          
          toast({
              title: "Avatar Loaded",
              description: "Your VRM model is ready to go!",
          });
        },
        undefined,
        (error) => {
          console.error(error);
          toast({
              title: "Load Error",
              description: "Failed to load the VRM model. Please check the file and try again.",
              variant: "destructive",
          });
        }
      );
    }

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (currentVrm.current) {
        currentVrm.current.update(delta);
      }
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    resizeObserver.observe(mount);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      mount.removeChild(renderer.domElement);
      if(currentVrm.current) {
        VRMUtils.deepDispose(currentVrm.current.scene);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [vrmUrl, toast]);

  return (
    <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing">
      <video ref={videoRef} style={{ display: "none" }}></video>
    </div>
  );
};

export default ThreeCanvas;

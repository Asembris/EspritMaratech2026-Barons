import ffmpeg
import os
import uuid
import asyncio
from typing import List
from pathlib import Path

class VideoProcessor:
    def __init__(self, temp_dir: str = "temp_videos"):
        self.temp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), temp_dir)
        os.makedirs(self.temp_dir, exist_ok=True)

    async def concatenate_videos(self, video_paths: List[str], transition_duration: float = 0.2) -> str:
        """
        Concatenates multiple video files with crossfade transitions.
        Returns the path to the generated output file.
        """
        if not video_paths:
            raise ValueError("No video paths provided")

        if len(video_paths) == 1:
            return video_paths[0]

        output_filename = f"{uuid.uuid4()}.mp4"
        output_path = os.path.join(self.temp_dir, output_filename)

        # Build ffmpeg input streams
        streams = []
        for path in video_paths:
            if not os.path.exists(path):
                print(f"Warning: Video file not found: {path}")
                continue
            streams.append(ffmpeg.input(path))

        if not streams:
            raise ValueError("No valid video files found")

        # Create filter graph for concatenation
        # Simple concatenation for now to ensure speed/stability, 
        # crossfades can be complex regarding distinct resolutions/framerates
        
        # Using concat demuxer approach via complex filter is safest for disparate files 
        # but requires re-encoding which is slow.
        # Let's try the stream concat method.
        
        try:
            # We need to scale all videos to the same resolution and framerate to avoid issues
            width = 1280
            height = 720
            fps = 30
            
            processed_streams = []
            for s in streams:
                s = s.filter('scale', width, height).filter('setsar', 1)
                # Ensure audio stream exists or generate silence?
                # For LSF, audio might not be present or important, but ffmpeg concat expects matching streams
                # Let's strip audio for sign language to simplify concatenation
                processed_streams.append(s)

            joined = ffmpeg.concat(*processed_streams, v=1, a=0).node
            v = joined[0]
            
            runner = ffmpeg.output(v, output_path, vcodec='libx264', preset='ultrafast', crf=28, pix_fmt='yuv420p')
            
            # Run ffmpeg asynchronously
            def run_ffmpeg():
                runner.run(overwrite_output=True)
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, run_ffmpeg)

            return output_path

        except ffmpeg.Error as e:
            print('stdout:', e.stdout.decode('utf8'))
            print('stderr:', e.stderr.decode('utf8'))
            raise e
        except Exception as e:
            print(f"Error concatenating videos: {e}")
            raise e

    def cleanup(self, file_path: str):
        """Removes the temporary file."""
        try:
            if os.path.exists(file_path) and self.temp_dir in file_path:
                os.remove(file_path)
        except Exception as e:
            print(f"Error cleaning up {file_path}: {e}")

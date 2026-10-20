//go:build linux

package main

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"github.com/coder/websocket"
	"github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/msg"
	"google.golang.org/protobuf/proto"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestConsoleDrainReturnsAfterGameExit(t *testing.T) {
	c := &console{lines: make(chan string, 2)}
	c.lines <- "old output"
	close(c.lines)
	c.drain()
}

func TestNativeCaptureConvertsEngineExport(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg is not installed")
	}
	t.Setenv("AT_KEEP_SCRATCH", "")
	dir := t.TempDir()
	images := filepath.Join(dir, "csgo", "at-native", "movie")
	audio := filepath.Join(dir, "csgo", "movie")
	for _, p := range []string{images, audio} {
		if err := os.MkdirAll(p, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	b, err := newNativeBridge()
	if err != nil {
		t.Fatal(err)
	}
	defer b.close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws://127.0.0.1:"+b.port+"?process=game", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()
	consoleReader, consoleWriter := net.Pipe()
	defer consoleReader.Close()
	defer consoleWriter.Close()
	// Drain the final host_framerate reset sent to the console.
	go func() {
		buf := make([]byte, 256)
		for {
			if _, err := consoleReader.Read(buf); err != nil {
				return
			}
		}
	}()
	g := &game{native: b, demoPath: filepath.Join(dir, "test.dem"), width: 16, height: 16, con: &console{conn: consoleWriter, lines: make(chan string, 20)}}
	r := &recorder{gameDir: dir, jobContext: ctx}
	pluginError := make(chan error, 1)
	go func() {
		_, message, err := c.Read(ctx)
		if err != nil {
			pluginError <- err
			return
		}
		var play struct {
			Name    string `json:"name"`
			Payload string `json:"payload"`
		}
		if err := json.Unmarshal(message, &play); err != nil {
			pluginError <- err
			return
		}
		if play.Name != "playdemo" || play.Payload != g.demoPath {
			pluginError <- fmt.Errorf("wrong play message: %s", message)
			return
		}
		data, err := os.ReadFile(play.Payload + ".json")
		if err != nil {
			pluginError <- err
			return
		}
		var sequences []nativeSequence
		if err := json.Unmarshal(data, &sequences); err != nil {
			pluginError <- err
			return
		}
		var prefix string
		for _, a := range sequences[0].Actions {
			if strings.HasPrefix(a.Cmd, "startmovie ") {
				prefix = strings.TrimPrefix(a.Cmd, "startmovie ")
			}
		}
		if prefix == "" {
			pluginError <- fmt.Errorf("no startmovie action")
			return
		}
		// from=100, to=162+2 guard ticks: one second at 60 frames/sec.
		for i := 0; i < 60; i++ {
			tga := make([]byte, 18+16*16*3)
			tga[2] = 2
			binary.LittleEndian.PutUint16(tga[12:14], 16)
			binary.LittleEndian.PutUint16(tga[14:16], 16)
			tga[16] = 24
			for j := 18; j < len(tga); j++ {
				tga[j] = byte(i)
			}
			if err := os.WriteFile(filepath.Join(images, fmt.Sprintf("%s%08d.tga", prefix, i)), tga, 0o600); err != nil {
				pluginError <- err
				return
			}
		}
		wave := make([]byte, 44+48000*2)
		copy(wave, "RIFF")
		binary.LittleEndian.PutUint32(wave[4:8], uint32(len(wave)-8))
		copy(wave[8:], "WAVEfmt ")
		binary.LittleEndian.PutUint32(wave[16:20], 16)
		binary.LittleEndian.PutUint16(wave[20:22], 1)
		binary.LittleEndian.PutUint16(wave[22:24], 1)
		binary.LittleEndian.PutUint32(wave[24:28], 48000)
		binary.LittleEndian.PutUint32(wave[28:32], 96000)
		binary.LittleEndian.PutUint16(wave[32:34], 2)
		binary.LittleEndian.PutUint16(wave[34:36], 16)
		copy(wave[36:], "data")
		binary.LittleEndian.PutUint32(wave[40:44], uint32(len(wave)-44))
		if err := os.WriteFile(filepath.Join(audio, prefix+".wav"), wave, 0o600); err != nil {
			pluginError <- err
			return
		}
		g.con.lines <- "CSDM: [100] Executing: startmovie " + prefix
		g.con.lines <- "CSDM: [164] Executing: echo AT_NATIVE_DONE_" + prefix // must not finish on the log line
		g.con.lines <- "AT_NATIVE_DONE_" + prefix
		pluginError <- nil
	}()
	raw, wav := filepath.Join(dir, "out.yuv"), filepath.Join(dir, "out.wav")
	ticks, first, err := r.captureNative(g, "player", 100, 162, 60, raw, wav)
	if err != nil {
		t.Fatal(err)
	}
	if err := <-pluginError; err != nil {
		t.Fatal(err)
	}
	if len(ticks) != 60 || first != 100 {
		t.Fatalf("bad native clock: first=%v, frames=%d", first, len(ticks))
	}
	info, err := os.Stat(raw)
	if err != nil || info.Size() != 60*16*16*3/2 {
		t.Fatalf("bad I420 conversion: %v %v", info, err)
	}
	if _, err := os.Stat(g.demoPath + ".json"); !os.IsNotExist(err) {
		t.Fatalf("actions left behind: %v", err)
	}
	entries, _ := os.ReadDir(images)
	if len(entries) != 0 {
		t.Fatal("raw TGA files left behind after conversion")
	}
}

func TestNativeBootstrapReadsDemoMap(t *testing.T) {
	header, err := proto.Marshal(&msg.CDemoFileHeader{DemoFileStamp: proto.String("PBDEMS2"), MapName: proto.String("de_mirage"), PatchVersion: proto.Int32(14191)})
	if err != nil {
		t.Fatal(err)
	}
	data := append([]byte("PBDEMS2\x00"), make([]byte, 8)...)
	data = append(data, 1, 0) // DEM_FileHeader, tick 0
	var size [10]byte
	n := binary.PutUvarint(size[:], uint64(len(header)))
	data = append(data, size[:n]...)
	data = append(data, header...)
	path := filepath.Join(t.TempDir(), "match.dem")
	if err := os.WriteFile(path, data, 0600); err != nil {
		t.Fatal(err)
	}
	got, err := nativeDemoMap(path)
	if err != nil || got != "de_mirage" {
		t.Fatalf("map=%q, error=%v", got, err)
	}
}

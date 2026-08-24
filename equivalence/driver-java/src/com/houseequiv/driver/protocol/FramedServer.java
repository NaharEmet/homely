package com.houseequiv.driver.protocol;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * Newline-delimited JSON TCP server (docs/specs/ws-protocol.md v1).
 *
 * Binds loopback only. On every accepted connection it immediately sends the
 * hello line (unsolicited, adapter -> orchestrator), then answers exactly one
 * response per request line until the peer disconnects.
 */
public final class FramedServer {

  private final int port;
  private final Dispatcher dispatcher;
  private final String helloLine;
  private long connectionCounter;

  public FramedServer(int port, Dispatcher dispatcher, String helloLine) {
    this.port = port;
    this.dispatcher = dispatcher;
    this.helloLine = helloLine;
  }

  /** Blocks forever accepting connections; call from a non-EDT thread. */
  public void start() throws IOException {
    ServerSocket serverSocket = new ServerSocket(port, 8, InetAddress.getByName("127.0.0.1"));
    System.out.println("[driver] listening on 127.0.0.1:" + port);
    while (true) {
      Socket socket = serverSocket.accept();
      long connectionId = ++connectionCounter;
      Thread worker = new Thread(() -> serve(socket), "driver-conn-" + connectionId);
      worker.setDaemon(true);
      worker.start();
    }
  }

  private void serve(Socket socket) {
    String remote = socket.getRemoteSocketAddress().toString();
    System.out.println("[driver] connection " + connectionCounter + " from " + remote);
    try (Socket s = socket;
         BufferedReader in = new BufferedReader(
             new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
         Writer out = new OutputStreamWriter(s.getOutputStream(), StandardCharsets.UTF_8)) {
      out.write(helloLine);
      out.write('\n');
      out.flush();

      String line;
      while ((line = in.readLine()) != null) {
        if (line.isBlank()) {
          continue;
        }
        long started = System.nanoTime();
        String response = dispatcher.handle(line.trim());
        out.write(response);
        out.write('\n');
        out.flush();
        System.out.printf("[driver] conn %d handled in %.1f ms%n",
            connectionCounter, (System.nanoTime() - started) / 1e6);
      }
      System.out.println("[driver] connection " + connectionCounter + " closed by peer");
    } catch (IOException e) {
      System.out.println("[driver] connection " + connectionCounter + " dropped: " + e);
    }
  }
}

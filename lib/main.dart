import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const NovaApp());
}

class NovaApp extends StatelessWidget {
  const NovaApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NOVA.AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF9d4edd),
      ),
      home: const NovaWebView(),
    );
  }
}

class NovaWebView extends StatefulWidget {
  const NovaWebView({Key? key}) : super(key: key);

  @override
  State<NovaWebView> createState() => _NovaWebViewState();
}

class _NovaWebViewState extends State<NovaWebView> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF020008))
      ..loadRequest(Uri.parse('https://nova-tau-roan.vercel.app/'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020008),
      body: SafeArea(
        child: WebViewWidget(controller: controller),
      ),
    );
  }
}

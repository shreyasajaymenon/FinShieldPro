package com.finshield.algorithms;

import java.util.HashMap;
import java.util.Map;

public class RadixTree {
    private static class Node {
        Map<Character, Edge> edges = new HashMap<>();
        boolean isEndOfPattern = false;
        String threatLabel = null;
    }

    private static class Edge {
        String label;
        Node target;
        Edge(String label, Node target) {
            this.label = label;
            this.target = target;
        }
    }

    private final Node root = new Node();
    private int nodeCount = 1;

    public void insert(String pattern, String threatLabel) {
        if (pattern == null || pattern.isBlank()) return;
        insertRecursive(root, pattern.toLowerCase(), threatLabel);
    }

    private void insertRecursive(Node current, String remaining, String threatLabel) {
        if (remaining.isEmpty()) {
            current.isEndOfPattern = true;
            current.threatLabel = threatLabel;
            return;
        }
        char firstChar = remaining.charAt(0);
        Edge edge = current.edges.get(firstChar);
        if (edge == null) {
            Node newNode = new Node();
            newNode.isEndOfPattern = true;
            newNode.threatLabel = threatLabel;
            current.edges.put(firstChar, new Edge(remaining, newNode));
            nodeCount++;
            return;
        }
        int commonLen = commonPrefixLength(edge.label, remaining);
        if (commonLen == edge.label.length()) {
            insertRecursive(edge.target, remaining.substring(commonLen), threatLabel);
        } else {
            Node splitNode = new Node();
            nodeCount++;
            String edgeSuffix = edge.label.substring(commonLen);
            splitNode.edges.put(edgeSuffix.charAt(0), new Edge(edgeSuffix, edge.target));
            edge.label = edge.label.substring(0, commonLen);
            edge.target = splitNode;
            String remainingSuffix = remaining.substring(commonLen);
            if (remainingSuffix.isEmpty()) {
                splitNode.isEndOfPattern = true;
                splitNode.threatLabel = threatLabel;
            } else {
                Node leaf = new Node();
                leaf.isEndOfPattern = true;
                leaf.threatLabel = threatLabel;
                splitNode.edges.put(remainingSuffix.charAt(0), new Edge(remainingSuffix, leaf));
                nodeCount++;
            }
        }
    }

    public String matchThreatPrefix(String input) {
        if (input == null || input.isBlank()) return null;
        String text = input.toLowerCase();
        Node current = root;
        int idx = 0;
        while (idx < text.length()) {
            if (current.isEndOfPattern) return current.threatLabel;
            Edge edge = current.edges.get(text.charAt(idx));
            if (edge == null) return null;
            if (text.startsWith(edge.label, idx)) {
                idx += edge.label.length();
                current = edge.target;
            } else {
                return null;
            }
        }
        return current.isEndOfPattern ? current.threatLabel : null;
    }

    private int commonPrefixLength(String a, String b) {
        int len = Math.min(a.length(), b.length());
        int i = 0;
        while (i < len && a.charAt(i) == b.charAt(i)) i++;
        return i;
    }

    public int getCompressedNodeCount() { return nodeCount; }
}
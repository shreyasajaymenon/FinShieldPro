package com.finshield.algorithms;

import java.util.*;

public class DisjointSetUnion {
    private final Map<String, String> parent = new HashMap<>();
    private final Map<String, Integer> rank = new HashMap<>();
    private final Map<String, Integer> componentSize = new HashMap<>();

    public void makeSet(String element) {
        if (!parent.containsKey(element)) {
            parent.put(element, element);
            rank.put(element, 0);
            componentSize.put(element, 1);
        }
    }

    public String find(String element) {
        makeSet(element);
        if (!parent.get(element).equals(element)) {
            parent.put(element, find(parent.get(element)));
        }
        return parent.get(element);
    }

    public void union(String a, String b) {
        String rootA = find(a);
        String rootB = find(b);
        if (rootA.equals(rootB)) return;
        int rankA = rank.get(rootA);
        int rankB = rank.get(rootB);
        if (rankA < rankB) {
            parent.put(rootA, rootB);
            componentSize.put(rootB, componentSize.get(rootB) + componentSize.get(rootA));
        } else if (rankA > rankB) {
            parent.put(rootB, rootA);
            componentSize.put(rootA, componentSize.get(rootA) + componentSize.get(rootB));
        } else {
            parent.put(rootB, rootA);
            rank.put(rootA, rankA + 1);
            componentSize.put(rootA, componentSize.get(rootA) + componentSize.get(rootB));
        }
    }

    public int getClusterSize(String element) {
        return componentSize.getOrDefault(find(element), 1);
    }

    public Map<String, List<String>> getAllClusters(int minSize) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String node : parent.keySet()) {
            String root = find(node);
            groups.computeIfAbsent(root, k -> new ArrayList<>()).add(node);
        }
        groups.entrySet().removeIf(entry -> entry.getValue().size() < minSize);
        return groups;
    }
}
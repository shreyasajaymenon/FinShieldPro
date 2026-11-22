package com.finshield.algorithms;

import java.util.concurrent.ThreadLocalRandom;

public class RandomizedQuickselect {
    public static double findPercentile(double[] values, double percentile) {
        if (values == null || values.length == 0) {
            throw new IllegalArgumentException("Cannot compute percentile of empty array.");
        }
        if (percentile < 0 || percentile > 100) {
            throw new IllegalArgumentException("Percentile must be between 0 and 100.");
        }
        double[] copy = values.clone();
        int targetIndex = (int) Math.ceil((percentile / 100.0) * copy.length) - 1;
        targetIndex = Math.max(0, Math.min(copy.length - 1, targetIndex));
        return quickselect(copy, 0, copy.length - 1, targetIndex);
    }

    private static double quickselect(double[] arr, int left, int right, int k) {
        while (left <= right) {
            if (left == right) return arr[left];
            int pivotIndex = ThreadLocalRandom.current().nextInt(left, right + 1);
            pivotIndex = partition(arr, left, right, pivotIndex);
            if (k == pivotIndex) return arr[k];
            else if (k < pivotIndex) right = pivotIndex - 1;
            else left = pivotIndex + 1;
        }
        return arr[k];
    }

    private static int partition(double[] arr, int left, int right, int pivotIndex) {
        double pivotValue = arr[pivotIndex];
        swap(arr, pivotIndex, right);
        int storeIndex = left;
        for (int i = left; i < right; i++) {
            if (arr[i] < pivotValue) {
                swap(arr, storeIndex, i);
                storeIndex++;
            }
        }
        swap(arr, right, storeIndex);
        return storeIndex;
    }

    private static void swap(double[] arr, int i, int j) {
        double temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
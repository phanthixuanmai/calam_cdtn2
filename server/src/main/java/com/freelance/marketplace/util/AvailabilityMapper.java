package com.freelance.marketplace.util;

import com.freelance.marketplace.dto.AvailabilitySlotRequest;
import com.freelance.marketplace.entity.AvailabilitySlot;
import com.freelance.marketplace.exception.BadRequestException;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class AvailabilityMapper {

    private static final Set<String> DAYS = Set.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
    );

    private AvailabilityMapper() {
    }

    public static List<AvailabilitySlot> toEntities(List<AvailabilitySlotRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return new ArrayList<>();
        }

        List<AvailabilitySlot> slots = new ArrayList<>();
        for (AvailabilitySlotRequest request : requests) {
            if (request == null || request.day() == null || request.startTime() == null || request.endTime() == null) {
                throw new BadRequestException("Vui lòng nhập đầy đủ ngày và khung giờ có thể làm việc");
            }
            String day = request.day().toUpperCase(Locale.ROOT);
            if (!DAYS.contains(day)) {
                throw new BadRequestException("Ngày có thể làm việc không hợp lệ");
            }

            try {
                LocalTime start = LocalTime.parse(request.startTime());
                LocalTime end = LocalTime.parse(request.endTime());
                if (!end.isAfter(start)) {
                    throw new BadRequestException("Giờ kết thúc phải sau giờ bắt đầu");
                }
            } catch (DateTimeParseException ex) {
                throw new BadRequestException("Khung giờ làm việc không hợp lệ");
            }

            slots.add(new AvailabilitySlot(day, request.startTime(), request.endTime()));
        }

        slots.sort(Comparator.comparing(AvailabilitySlot::getDay).thenComparing(AvailabilitySlot::getStartTime));
        for (int i = 1; i < slots.size(); i++) {
            AvailabilitySlot previous = slots.get(i - 1);
            AvailabilitySlot current = slots.get(i);
            if (previous.getDay().equals(current.getDay())
                    && LocalTime.parse(current.getStartTime()).isBefore(LocalTime.parse(previous.getEndTime()))) {
                throw new BadRequestException("Các khung giờ trong cùng một ngày không được chồng lấn");
            }
        }

        return slots;
    }
}

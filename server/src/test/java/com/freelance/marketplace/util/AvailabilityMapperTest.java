package com.freelance.marketplace.util;

import com.freelance.marketplace.dto.AvailabilitySlotRequest;
import com.freelance.marketplace.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AvailabilityMapperTest {

    @Test
    void mapsMultipleNonOverlappingSlotsForOneDay() {
        var slots = AvailabilityMapper.toEntities(List.of(
                new AvailabilitySlotRequest("MONDAY", "13:00", "17:00"),
                new AvailabilitySlotRequest("MONDAY", "08:00", "11:00")
        ));

        assertEquals(2, slots.size());
        assertEquals("08:00", slots.get(0).getStartTime());
    }

    @Test
    void rejectsEndTimeThatIsNotAfterStartTime() {
        assertThrows(BadRequestException.class, () -> AvailabilityMapper.toEntities(List.of(
                new AvailabilitySlotRequest("TUESDAY", "18:00", "18:00")
        )));
    }

    @Test
    void rejectsOverlappingSlotsOnTheSameDay() {
        assertThrows(BadRequestException.class, () -> AvailabilityMapper.toEntities(List.of(
                new AvailabilitySlotRequest("FRIDAY", "09:00", "12:00"),
                new AvailabilitySlotRequest("FRIDAY", "11:30", "14:00")
        )));
    }
}

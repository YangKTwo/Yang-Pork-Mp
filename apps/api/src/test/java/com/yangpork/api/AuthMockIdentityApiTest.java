package com.yangpork.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:authid;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.task.scheduling.enabled=false"
})
class AuthMockIdentityApiTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;

    @Test
    void mockWxLoginMapsDistinctDevKeysToDistinctUsers() throws Exception {
        JsonNode userA = loginUser("dev_customer_a");
        JsonNode userB = loginUser("dev_customer_b");
        assertNotEquals(userA.get("id").asText(), userB.get("id").asText());

        JsonNode userA2 = loginUser("dev_customer_a");
        assertEquals(userA.get("id").asText(), userA2.get("id").asText());
    }

    private JsonNode loginUser(String devKey) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/wx-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Dev-Key", devKey)
                        .content("{\"code\":\"placeholder\",\"devKey\":\"" + devKey + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = json.readTree(result.getResponse().getContentAsByteArray());
        return root.get("data").get("user");
    }
}

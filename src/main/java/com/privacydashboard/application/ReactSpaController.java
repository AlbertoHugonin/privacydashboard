package com.privacydashboard.application;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ReactSpaController {

    @GetMapping({"/react", "/react/", "/react/{path:[^\\.]*}", "/react/**/{path:[^\\.]*}"})
    public String forwardReact() {
        return "forward:/react/index.html";
    }
}


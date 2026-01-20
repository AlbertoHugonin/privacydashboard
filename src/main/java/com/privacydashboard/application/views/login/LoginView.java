package com.privacydashboard.application.views.login;

import com.privacydashboard.application.security.UserDetailsServiceImpl;
import com.vaadin.flow.component.Component;
import com.vaadin.flow.component.html.H1;
import com.vaadin.flow.component.html.H3;
import com.vaadin.flow.component.html.H4;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.html.UnorderedList;
import com.vaadin.flow.component.html.ListItem;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.html.Div;
import com.vaadin.flow.component.login.LoginForm;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.router.*;
import org.springframework.beans.factory.annotation.Autowired;

@Route("login")
@PageTitle("Login")
public class LoginView extends VerticalLayout implements BeforeEnterObserver {
    private LoginForm loginForm = new LoginForm();

    @Autowired
    public LoginView(UserDetailsServiceImpl userProvider) {
        addClassName("login");
        setSizeFull();
        setAlignItems(Alignment.CENTER);
        loginForm.setForgotPasswordButtonVisible(false);
        loginForm.setAction("login");
        add(
                new H1("Privacy Dashboard"),
                loginForm,
                new RouterLink("Register", RegisterView.class),
                buildDemoAccounts()
        );
    }

    private Component buildDemoAccounts() {
        Div wrapper = new Div();
        wrapper.getStyle().set("max-width", "680px");
        wrapper.getStyle().set("width", "100%");
        wrapper.getStyle().set("margin-top", "24px");

        wrapper.add(new H3("Account demo"));
        wrapper.add(new Paragraph("Questi utenti vengono creati all'avvio dell'applicazione:"));

        wrapper.add(buildAccountCard(
                "Data Subject (SUBJECT)",
                "UserSubject",
                "UserSubject",
                new String[]{
                        "Vede le proprie app installate e i consensi associati; può accettare/revocare consensi.",
                        "Vede i contatti (Controller/DPO) legati alle app e può inviare/ricevere messaggi.",
                        "Visualizza e scarica i Privacy Notice delle app.",
                        "Invia richieste GDPR (accesso dati, info, cancellazione, reclamo, withdraw consent, delete everything) e ne vede stato/risposte.",
                        "Riceve notifiche (messaggi, aggiornamenti privacy notice, aggiornamenti richieste)."
                }
        ));

        wrapper.add(buildAccountCard(
                "Data Controller (CONTROLLER)",
                "UserController",
                "UserController",
                new String[]{
                        "Vede le app a lui associate e i contatti collegati (Subjects/DPO/Controllers).",
                        "Invia/riceve messaggi con i contatti associati alle app.",
                        "Riceve le richieste GDPR dai Data Subjects, può rispondere e cambiare lo stato (pending/handled).",
                        "Compila/aggiorna il questionario GDPR per le proprie app e visualizza la valutazione.",
                        "Crea/aggiorna i Privacy Notice delle proprie app (da zero / template / upload)."
                }
        ));

        wrapper.add(buildAccountCard(
                "Data Protection Officer (DPO)",
                "UserDPO",
                "UserDPO",
                new String[]{
                        "Vede le app a lui associate e i contatti collegati (Subjects/Controllers/DPO).",
                        "Invia/riceve messaggi con i contatti associati alle app.",
                        "Riceve le richieste GDPR dai Data Subjects, può rispondere e cambiare lo stato (pending/handled).",
                        "Compila/aggiorna il questionario GDPR per le proprie app e visualizza la valutazione.",
                        "Crea/aggiorna i Privacy Notice delle proprie app (da zero / template / upload)."
                }
        ));

        wrapper.add(new Paragraph("Nota: altri utenti demo possono essere generati; in quel caso la password è uguale allo username."));
        return wrapper;
    }

    private Component buildAccountCard(String title, String username, String password, String[] capabilities) {
        Div card = new Div();
        card.getStyle().set("padding", "12px 14px");
        card.getStyle().set("border", "1px solid var(--lumo-contrast-10pct)");
        card.getStyle().set("border-radius", "12px");
        card.getStyle().set("margin-top", "12px");

        H4 header = new H4(title);
        Paragraph creds = new Paragraph();
        Span credsCode = new Span("user=" + username + "  password=" + password);
        credsCode.getStyle()
                .set("font-family", "monospace")
                .set("background", "var(--lumo-contrast-5pct)")
                .set("padding", "2px 6px")
                .set("border-radius", "6px");
        creds.add(credsCode);

        UnorderedList list = new UnorderedList();
        for (String capability : capabilities) {
            list.add(new ListItem(capability));
        }

        card.add(header, creds, list);
        return card;
    }

    @Override
    public void beforeEnter(BeforeEnterEvent beforeEnterEvent){
        if(beforeEnterEvent.getLocation().getQueryParameters().getParameters().containsKey("error")){
            loginForm.setError(true);
        }

    }
}
